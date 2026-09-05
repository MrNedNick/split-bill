import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'
import { settle, settlementText } from './settle'
import type { Bill } from './types'

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'b1',
    title: 'Dinner',
    createdAt: '2026-09-05T18:00:00.000Z',
    participants: [
      { id: 'ada', name: 'Ada' },
      { id: 'bo', name: 'Bo' },
      { id: 'cleo', name: 'Cleo' },
    ],
    items: [
      { id: 'i1', label: 'Pasta', cents: 1250, sharedBy: [] },
      { id: 'i2', label: 'Wine', cents: 2300, sharedBy: [] },
      { id: 'i3', label: 'Tiramisu', cents: 1000, sharedBy: ['ada', 'bo'] },
    ],
    tip: { kind: 'percent', value: 0 },
    servicePercent: 0,
    roundUp: false,
    ...overrides,
  }
}

const sumOfShares = (b: Bill) => settle(b).shares.reduce((total, share) => total + share.total, 0)

describe('settle', () => {
  it('charges an item only to the people who shared it', () => {
    const result = settle(bill())
    const ada = result.shares.find((share) => share.name === 'Ada')!
    const cleo = result.shares.find((share) => share.name === 'Cleo')!

    // Pasta and wine are split three ways (417/417/416 and 767/767/766); the
    // tiramisu is Ada and Bo's alone.
    expect(cleo.items).toBe(1182)
    expect(ada.items).toBe(1684)
    expect(ada.items + result.shares[1].items + cleo.items).toBe(result.subtotal)
    expect(result.subtotal).toBe(4550)
  })

  it('adds up to the bill, to the cent — the whole point', () => {
    expect(sumOfShares(bill())).toBe(settle(bill()).total)
  })

  it('still adds up with a percentage tip', () => {
    const withTip = bill({ tip: { kind: 'percent', value: 10 } })
    const result = settle(withTip)
    expect(result.tip).toBe(455)
    expect(sumOfShares(withTip)).toBe(result.total)
    expect(result.total).toBe(5005)
  })

  it('still adds up with a fixed tip that does not divide evenly', () => {
    const withTip = bill({ tip: { kind: 'amount', value: 1000 } })
    expect(sumOfShares(withTip)).toBe(settle(withTip).total)
  })

  it('still adds up with a service charge and rounding together', () => {
    const awkward = bill({
      tip: { kind: 'percent', value: 13 },
      servicePercent: 7,
      roundUp: true,
    })
    const result = settle(awkward)
    expect(sumOfShares(awkward)).toBe(result.total)
    expect(result.rounding).toBeGreaterThan(0)
    // Rounding up means nobody pays a fraction of a unit.
    expect(result.shares.every((share) => share.total % 100 === 0)).toBe(true)
  })

  it('adds up for 500 randomly shaped bills', () => {
    let seed = 42
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

    for (let run = 0; run < 500; run += 1) {
      const people = 1 + Math.floor(random() * 6)
      const participants = Array.from({ length: people }, (_, index) => ({
        id: `p${index}`,
        name: `P${index}`,
      }))
      const items = Array.from({ length: Math.floor(random() * 8) }, (_, index) => ({
        id: `i${index}`,
        label: `Item ${index}`,
        cents: Math.floor(random() * 9999) + 1,
        sharedBy: participants.filter(() => random() > 0.5).map((person) => person.id),
      }))
      const candidate = bill({
        participants,
        items,
        tip: random() > 0.5
          ? { kind: 'percent', value: Math.floor(random() * 25) }
          : { kind: 'amount', value: Math.floor(random() * 3000) },
        servicePercent: Math.floor(random() * 15),
        roundUp: random() > 0.5,
      })

      expect(sumOfShares(candidate)).toBe(settle(candidate).total)
    }
  })

  it('treats an item nobody claimed as shared by everyone', () => {
    const result = settle(bill({ items: [{ id: 'i1', label: 'Bread', cents: 301, sharedBy: [] }] }))
    expect(result.shares.map((share) => share.items)).toEqual([101, 100, 100])
    expect(result.total).toBe(301)
  })

  it('survives a bill with nobody on it', () => {
    const result = settle(bill({ participants: [], items: [] }))
    expect(result.total).toBe(0)
    expect(result.shares).toEqual([])
  })

  it('re-splits an item when the person on it is gone', () => {
    // The store strips a removed participant from every item; what is left has
    // to stay chargeable rather than vanish from the bill.
    const orphaned = bill({
      participants: [{ id: 'ada', name: 'Ada' }],
      items: [{ id: 'i1', label: 'Steak', cents: 2000, sharedBy: [] }],
    })
    expect(settle(orphaned).shares[0].total).toBe(2000)
  })
})

describe('settlementText', () => {
  it('reads as a message, not as a data dump', () => {
    const withTip = bill({ tip: { kind: 'percent', value: 10 } })
    const text = settlementText(withTip, settle(withTip), formatMoney)

    expect(text.startsWith('Dinner')).toBe(true)
    expect(text).toContain('Ada: €18.53')
    expect(text).toContain('Tip €4.55')
    expect(text).toContain('Total €50.05')
    expect(text).not.toContain('undefined')
  })

  it('leaves out lines that are zero', () => {
    const text = settlementText(bill(), settle(bill()), formatMoney)
    expect(text).not.toContain('Tip')
    expect(text).not.toContain('Service')
  })
})
