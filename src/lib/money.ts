/**
 * Money is integer cents everywhere. No float ever touches a total: a bill is
 * split by handing out whole cents, so the shares always add up to the bill.
 */
export type Cents = number

export function formatMoney(cents: Cents, currency = 'EUR', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

/** Parses what a person types — "12", "12.5", "12,50" — into cents. */
export function parseAmount(input: string): Cents | null {
  const cleaned = input.trim().replace(',', '.').replace(/[^\d.]/g, '')
  if (!cleaned || !/^\d*\.?\d*$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

/**
 * Splits an amount into `weights.length` parts that sum to exactly `total`.
 *
 * Largest remainder: everyone gets the floor of their share, and the cents left
 * over go to the parts with the biggest fractional remainder — ties broken by
 * position, so the result is deterministic and the same input always produces
 * the same split.
 */
export function divide(total: Cents, weights: readonly number[]): Cents[] {
  const count = weights.length
  if (count === 0) return []

  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  if (sum <= 0) {
    // No weights to go by (a fresh bill with no items): split evenly.
    return divide(total, new Array<number>(count).fill(1))
  }

  const exact = weights.map((weight) => (total * weight) / sum)
  const shares = exact.map((value) => Math.floor(value))
  let left = total - shares.reduce((acc, value) => acc + value, 0)

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  for (let i = 0; left > 0; i = (i + 1) % count) {
    shares[order[i].index] += 1
    left -= 1
  }

  return shares
}

/** Rounds one person's total up to the next whole unit; returns the extra cents. */
export function roundUpTo(cents: Cents, unit: Cents = 100): { total: Cents; added: Cents } {
  const remainder = cents % unit
  if (remainder === 0) return { total: cents, added: 0 }
  const added = unit - remainder
  return { total: cents + added, added }
}
