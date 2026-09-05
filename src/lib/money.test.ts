import { describe, expect, it } from 'vitest'
import { divide, formatMoney, parseAmount, roundUpTo } from './money'

describe('parseAmount', () => {
  it('reads what people actually type', () => {
    expect(parseAmount('12')).toBe(1200)
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('12,50')).toBe(1250)
    expect(parseAmount(' 12.50 ')).toBe(1250)
    expect(parseAmount('€12.50')).toBe(1250)
  })

  it('refuses what is not a price', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.2.3')).toBeNull()
  })

  it('never loses a cent to floating point', () => {
    expect(parseAmount('0.07')).toBe(7)
    expect(parseAmount('19.99')).toBe(1999)
    expect(parseAmount('1234.56')).toBe(123456)
  })
})

describe('divide', () => {
  it('hands out every cent', () => {
    expect(divide(1000, [1, 1, 1])).toEqual([334, 333, 333])
    expect(divide(1000, [1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('splits by weight, not evenly, when weights differ', () => {
    expect(divide(1000, [3, 1])).toEqual([750, 250])
    expect(divide(100, [2, 1, 1])).toEqual([50, 25, 25])
  })

  it('falls back to an even split when there is nothing to weigh', () => {
    expect(divide(1000, [0, 0, 0])).toEqual([334, 333, 333])
  })

  it('adds up for any total and any split — 2000 random cases', () => {
    let seed = 7
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

    for (let run = 0; run < 2000; run += 1) {
      const total = Math.floor(random() * 500_000)
      const people = 1 + Math.floor(random() * 8)
      const weights = Array.from({ length: people }, () => Math.floor(random() * 5000))
      const shares = divide(total, weights)

      expect(shares).toHaveLength(people)
      expect(shares.reduce((a, b) => a + b, 0)).toBe(total)
      expect(shares.every((share) => share >= 0)).toBe(true)
    }
  })

  it('is deterministic — the same bill splits the same way twice', () => {
    expect(divide(1001, [1, 1, 1])).toEqual(divide(1001, [1, 1, 1]))
  })
})

describe('roundUpTo', () => {
  it('rounds a share up to the whole unit and reports the difference', () => {
    expect(roundUpTo(1234)).toEqual({ total: 1300, added: 66 })
    expect(roundUpTo(1300)).toEqual({ total: 1300, added: 0 })
  })
})

describe('formatMoney', () => {
  it('always shows both cents', () => {
    expect(formatMoney(1250)).toBe('€12.50')
    expect(formatMoney(1200)).toBe('€12.00')
    expect(formatMoney(0)).toBe('€0.00')
  })
})
