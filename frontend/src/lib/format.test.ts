import { describe, expect, it } from 'vitest'
import { formatExerciseMetrics, formatMoneyExact, parseRinggitToSen } from './format'

describe('expense amounts', () => {
  it.each([
    ['0.01', 1],
    ['12.34', 1234],
    [' 1.2 ', 120],
    ['100', 10000],
  ])('converts %s ringgit to %i integer sen', (input, expected) => {
    expect(parseRinggitToSen(input)).toBe(expected)
    expect(Number.isSafeInteger(expected)).toBe(true)
  })

  it.each(['0', '0.00', '1.234', '-1', '1e2', '90071992547410'])
    ('rejects invalid or unsafe amount %s', (input) => {
      expect(parseRinggitToSen(input)).toBeNull()
    })

  it('formats stored sen without losing cents', () => {
    expect(formatMoneyExact(1234)).toBe('RM 12.34')
  })
})

describe('exercise metrics', () => {
  it('keeps metres optional while formatting seconds as minutes', () => {
    expect(formatExerciseMetrics(1800)).toBe('30 min')
    expect(formatExerciseMetrics(1800, 2400)).toContain('2,400 m')
  })
})
