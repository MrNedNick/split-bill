import { divide, roundUpTo, type Cents } from './money'
import type { Bill, Item, Participant, Settlement, Share } from './types'

function sharersOf(item: Item, participants: readonly Participant[]): readonly string[] {
  // An item with nobody on it belongs to everybody — that is what "shared"
  // means at a table, and it keeps the totals complete while you are still
  // typing the bill in.
  const ids = item.sharedBy.filter((id) => participants.some((p) => p.id === id))
  return ids.length ? ids : participants.map((p) => p.id)
}

/**
 * Turns a bill into what each person owes.
 *
 * Everything is handed out in whole cents, so `sum(shares) === total` holds by
 * construction rather than by luck — including the tip, the service charge and
 * the rounding.
 */
export function settle(bill: Bill): Settlement {
  const people = bill.participants
  const empty: Settlement = {
    subtotal: 0,
    service: 0,
    tip: 0,
    rounding: 0,
    total: 0,
    shares: [],
    unassigned: [],
  }
  if (people.length === 0) return empty

  const byPerson = new Map<string, Cents>(people.map((person) => [person.id, 0]))

  for (const item of bill.items) {
    const sharers = sharersOf(item, people)
    const parts = divide(item.cents, new Array<number>(sharers.length).fill(1))
    sharers.forEach((id, index) => {
      byPerson.set(id, (byPerson.get(id) ?? 0) + parts[index])
    })
  }

  const subtotal = bill.items.reduce((sum, item) => sum + item.cents, 0)
  const service = Math.round((subtotal * bill.servicePercent) / 100)
  const tip =
    bill.tip.kind === 'percent' ? Math.round((subtotal * bill.tip.value) / 100) : bill.tip.value

  // Service and tip follow what each person actually ordered.
  const weights = people.map((person) => byPerson.get(person.id) ?? 0)
  const serviceShares = divide(service, weights)
  const tipShares = divide(tip, weights)

  const draft = people.map((person, index) => {
    const items = byPerson.get(person.id) ?? 0
    return {
      participantId: person.id,
      name: person.name,
      items,
      service: serviceShares[index],
      tip: tipShares[index],
      rounding: 0,
      total: items + serviceShares[index] + tipShares[index],
    }
  })

  let rounding = 0
  const shares: Share[] = draft.map((share) => {
    if (!bill.roundUp) return share
    const { total, added } = roundUpTo(share.total)
    rounding += added
    return { ...share, rounding: added, total }
  })

  return {
    subtotal,
    service,
    tip,
    rounding,
    total: subtotal + service + tip + rounding,
    shares,
    unassigned: bill.items.filter((item) => item.sharedBy.length === 0),
  }
}

/** The message that goes into a chat when someone taps Share. */
export function settlementText(bill: Bill, settlement: Settlement, format: (cents: Cents) => string): string {
  const lines = [
    bill.title || 'Split bill',
    ...settlement.shares.map((share) => `${share.name}: ${format(share.total)}`),
    '',
    `Items ${format(settlement.subtotal)}`,
  ]
  if (settlement.service > 0) lines.push(`Service ${format(settlement.service)}`)
  if (settlement.tip > 0) lines.push(`Tip ${format(settlement.tip)}`)
  if (settlement.rounding > 0) lines.push(`Rounded up ${format(settlement.rounding)}`)
  lines.push(`Total ${format(settlement.total)}`)
  return lines.join('\n')
}
