import { describe, expect, it } from 'vitest'
import { formatDuration, formatExerciseMetrics, formatMoneyExact, parseDurationToSeconds, parseRinggitToSen } from './format'

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

  it.each([
    [2700, '45 min'],
    [3600, '1 hr'],
    [5400, '1 hr 30 min'],
    [8100, '2 hr 15 min'],
  ])('shows %i seconds as %s', (seconds, display) => {
    expect(formatDuration(seconds)).toBe(display)
  })

  it.each([
    ['1小时', 3600], ['1.5小时', 5400], ['一个半小时', 5400],
    ['90分钟', 5400], ['45min', 2700], ['1h30', 5400], ['2h15', 8100],
    ['1h30m', 5400],
    ['2小时15分钟', 8100], ['1 hr 30 min', 5400],
  ])('parses %s as %i internal seconds', (input, seconds) => {
    expect(parseDurationToSeconds(input)).toBe(seconds)
  })

  it.each(['0分钟', '1.5分钟', '1小时90分钟', '1.234小时', '1h60', '1h3', '1h300', '45km', '30', '-30min'])
    ('does not guess an invalid or incomplete duration: %s', (input) => {
      expect(parseDurationToSeconds(input)).toBeNull()
    })

  it('allows plain whole minutes only in the manual edit field', () => {
    expect(parseDurationToSeconds('30', true)).toBe(1800)
  })
})
