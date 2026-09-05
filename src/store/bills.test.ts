import { beforeEach, describe, expect, it, vi } from 'vitest'

// The store talks to the device through AsyncStorage; in a test the device is
// a Map. Everything above it — the reducers, the persistence shape — is real.
const memory = new Map<string, string>()
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => void memory.set(key, value),
    removeItem: async (key: string) => void memory.delete(key),
  },
}))

const { useBills } = await import('./bills')
const { settle, settlementText } = await import('../lib/settle')
const { formatMoney } = await import('../lib/money')

const reset = () => {
  memory.clear()
  useBills.setState({ bills: [], hydrated: true })
}

beforeEach(reset)

describe('the whole scenario, at the level the screens drive', () => {
  it('creates a bill, seats people, splits items and produces the message', async () => {
    const store = useBills.getState()

    const billId = store.createBill('Dinner at Osteria')
    for (const name of ['Ada', 'Bo', 'Cleo']) store.addParticipant(billId, name)

    const people = () => useBills.getState().bills.find((bill) => bill.id === billId)!.participants
    const [ada, bo] = people()

    store.addItem(billId, 'Pasta', 1250, [])
    store.addItem(billId, 'Wine', 2300, [])
    store.addItem(billId, 'Tiramisu', 1000, [ada.id, bo.id])
    store.setTip(billId, { kind: 'percent', value: 10 })

    const bill = useBills.getState().bills.find((item) => item.id === billId)!
    const settlement = settle(bill)

    expect(bill.participants).toHaveLength(3)
    expect(bill.items).toHaveLength(3)
    expect(settlement.subtotal).toBe(4550)
    expect(settlement.shares.reduce((sum, share) => sum + share.total, 0)).toBe(settlement.total)

    const message = settlementText(bill, settlement, formatMoney)
    expect(message).toContain('Ada:')
    expect(message).toContain('Total €50.05')
  })

  it('keeps a removed person off every item instead of leaving a ghost', () => {
    const store = useBills.getState()
    const billId = store.createBill('Lunch')
    store.addParticipant(billId, 'Ada')
    store.addParticipant(billId, 'Bo')

    const [ada, bo] = useBills.getState().bills[0].participants
    store.addItem(billId, 'Salad', 900, [ada.id, bo.id])
    store.removeParticipant(billId, ada.id)

    const bill = useBills.getState().bills[0]
    expect(bill.participants.map((person) => person.name)).toEqual(['Bo'])
    expect(bill.items[0].sharedBy).toEqual([bo.id])
    // The item stays on the bill and is now Bo's alone.
    expect(settle(bill).total).toBe(900)
  })

  it('toggles who shares an item both ways', () => {
    const store = useBills.getState()
    const billId = store.createBill('Brunch')
    store.addParticipant(billId, 'Ada')
    const [ada] = useBills.getState().bills[0].participants
    store.addItem(billId, 'Coffee', 350, [])

    const itemId = useBills.getState().bills[0].items[0].id
    store.toggleSharer(billId, itemId, ada.id)
    expect(useBills.getState().bills[0].items[0].sharedBy).toEqual([ada.id])
    store.toggleSharer(billId, itemId, ada.id)
    expect(useBills.getState().bills[0].items[0].sharedBy).toEqual([])
  })

  it('repeats the company without dragging last night’s food along', () => {
    const store = useBills.getState()
    const billId = store.createBill('Dinner')
    store.addParticipant(billId, 'Ada')
    store.addParticipant(billId, 'Bo')
    store.addItem(billId, 'Steak', 3000, [])

    const nextId = store.repeatCompany(billId, 'Dinner again')
    const next = useBills.getState().bills.find((bill) => bill.id === nextId)!

    expect(next.participants.map((person) => person.name)).toEqual(['Ada', 'Bo'])
    expect(next.items).toEqual([])
    // New people, not the same objects — editing one bill must not touch the other.
    const previous = useBills.getState().bills.find((bill) => bill.id === billId)!
    expect(next.participants[0].id).not.toBe(previous.participants[0].id)
  })

  it('writes the bills to the device and reads them back', async () => {
    const store = useBills.getState()
    const billId = store.createBill('Saved bill')
    store.addParticipant(billId, 'Ada')

    // Zustand's persist middleware writes asynchronously.
    await new Promise((resolve) => setTimeout(resolve, 10))
    const raw = memory.get('split-bill.v1')
    expect(raw).toBeTruthy()

    const stored = JSON.parse(raw!)
    expect(stored.state.bills[0].title).toBe('Saved bill')
    expect(stored.state.bills[0].participants[0].name).toBe('Ada')
  })

  it('keeps the newest bill first', () => {
    const store = useBills.getState()
    store.createBill('First')
    store.createBill('Second')
    expect(useBills.getState().bills.map((bill) => bill.title)).toEqual(['Second', 'First'])
  })
})
