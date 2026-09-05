import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Bill, Item, Participant } from '../lib/types'
import type { Cents } from '../lib/money'

const STORAGE_KEY = 'split-bill.v1'

/**
 * The web build prerenders every route in Node, where there is no `window` and
 * therefore no storage. Reading it there crashes the build; writing there would
 * be meaningless anyway, since the rendered HTML is the same for everyone.
 */
const canPersist = typeof window !== 'undefined'

const deviceStorage = {
  getItem: async (name: string) => (canPersist ? AsyncStorage.getItem(name) : null),
  setItem: async (name: string, value: string) => {
    if (canPersist) await AsyncStorage.setItem(name, value)
  },
  removeItem: async (name: string) => {
    if (canPersist) await AsyncStorage.removeItem(name)
  },
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface BillsState {
  bills: Bill[]
  /** False until the stored bills have been read back — the UI waits on this. */
  hydrated: boolean
  createBill: (title: string, participants?: readonly Participant[]) => string
  removeBill: (billId: string) => void
  renameBill: (billId: string, title: string) => void
  addParticipant: (billId: string, name: string) => void
  removeParticipant: (billId: string, participantId: string) => void
  addItem: (billId: string, label: string, cents: Cents, sharedBy: readonly string[]) => void
  updateItem: (billId: string, itemId: string, patch: Partial<Omit<Item, 'id'>>) => void
  removeItem: (billId: string, itemId: string) => void
  toggleSharer: (billId: string, itemId: string, participantId: string) => void
  setTip: (billId: string, tip: Bill['tip']) => void
  setServicePercent: (billId: string, percent: number) => void
  setRoundUp: (billId: string, roundUp: boolean) => void
  /** Starts a new bill with the same people and none of the items. */
  repeatCompany: (billId: string, title: string) => string
}

function patchBill(bills: Bill[], billId: string, change: (bill: Bill) => Bill): Bill[] {
  return bills.map((bill) => (bill.id === billId ? change(bill) : bill))
}

export const useBills = create<BillsState>()(
  persist(
    (set, get) => ({
      bills: [],
      hydrated: false,

      createBill: (title, participants = []) => {
        const billId = id('bill')
        const bill: Bill = {
          id: billId,
          title: title.trim() || 'Dinner',
          createdAt: new Date().toISOString(),
          participants: participants.map((person) => ({ ...person, id: id('p') })),
          items: [],
          tip: { kind: 'percent', value: 0 },
          servicePercent: 0,
          roundUp: false,
        }
        set({ bills: [bill, ...get().bills] })
        return billId
      },

      removeBill: (billId) => set({ bills: get().bills.filter((bill) => bill.id !== billId) }),

      renameBill: (billId, title) =>
        set({ bills: patchBill(get().bills, billId, (bill) => ({ ...bill, title })) }),

      addParticipant: (billId, name) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            participants: [...bill.participants, { id: id('p'), name: name.trim() }],
          })),
        }),

      // Removing a person must not leave their items charged to nobody: they
      // fall back to whoever is left on that item, or to everyone.
      removeParticipant: (billId, participantId) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            participants: bill.participants.filter((person) => person.id !== participantId),
            items: bill.items.map((item) => ({
              ...item,
              sharedBy: item.sharedBy.filter((sharer) => sharer !== participantId),
            })),
          })),
        }),

      addItem: (billId, label, cents, sharedBy) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            items: [
              ...bill.items,
              { id: id('i'), label: label.trim() || 'Item', cents, sharedBy: [...sharedBy] },
            ],
          })),
        }),

      updateItem: (billId, itemId, patch) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            items: bill.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          })),
        }),

      removeItem: (billId, itemId) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            items: bill.items.filter((item) => item.id !== itemId),
          })),
        }),

      toggleSharer: (billId, itemId, participantId) =>
        set({
          bills: patchBill(get().bills, billId, (bill) => ({
            ...bill,
            items: bill.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    sharedBy: item.sharedBy.includes(participantId)
                      ? item.sharedBy.filter((sharer) => sharer !== participantId)
                      : [...item.sharedBy, participantId],
                  }
                : item,
            ),
          })),
        }),

      setTip: (billId, tip) =>
        set({ bills: patchBill(get().bills, billId, (bill) => ({ ...bill, tip })) }),

      setServicePercent: (billId, servicePercent) =>
        set({ bills: patchBill(get().bills, billId, (bill) => ({ ...bill, servicePercent })) }),

      setRoundUp: (billId, roundUp) =>
        set({ bills: patchBill(get().bills, billId, (bill) => ({ ...bill, roundUp })) }),

      repeatCompany: (billId, title) => {
        const source = get().bills.find((bill) => bill.id === billId)
        // The people, not the food: a new evening with the same company.
        return get().createBill(title, source?.participants ?? [])
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => deviceStorage),
      partialize: (state) => ({ bills: state.bills }),
      // Runs once the stored bills are back, so a screen can tell "nothing
      // saved yet" from "not read yet" instead of flashing an empty list.
      onRehydrateStorage: () => () => {
        useBills.setState({ hydrated: true })
      },
    },
  ),
)
