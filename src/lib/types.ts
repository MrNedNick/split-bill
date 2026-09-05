import type { Cents } from './money'

export interface Participant {
  readonly id: string
  readonly name: string
}

export interface Item {
  readonly id: string
  readonly label: string
  readonly cents: Cents
  /** Participant ids sharing this item. Empty means "everyone". */
  readonly sharedBy: readonly string[]
}

export type TipKind = 'percent' | 'amount'

export interface Bill {
  readonly id: string
  readonly title: string
  readonly createdAt: string
  readonly participants: readonly Participant[]
  readonly items: readonly Item[]
  readonly tip: { readonly kind: TipKind; readonly value: number }
  /** Service charge or tax, in percent of the subtotal. */
  readonly servicePercent: number
  /** Round every share up to a whole unit; the difference lands in the tip. */
  readonly roundUp: boolean
}

export interface Share {
  readonly participantId: string
  readonly name: string
  readonly items: Cents
  readonly service: Cents
  readonly tip: Cents
  readonly rounding: Cents
  readonly total: Cents
}

export interface Settlement {
  readonly subtotal: Cents
  readonly service: Cents
  readonly tip: Cents
  readonly rounding: Cents
  readonly total: Cents
  readonly shares: readonly Share[]
  /** Items nobody has been assigned to yet — a bill is not settled until this is empty. */
  readonly unassigned: readonly Item[]
}
