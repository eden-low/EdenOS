import { describe, expect, it } from 'vitest'
import { cosmosDailyReflections, cosmosReflectionForLocalDate } from './dailyReflections'

describe('Cosmos daily reflections', () => {
  it('provides a curated set of unique, usable prompts', () => {
    expect(cosmosDailyReflections.length).toBeGreaterThanOrEqual(20)
    expect(new Set(cosmosDailyReflections.map((reflection) => reflection.id)).size).toBe(cosmosDailyReflections.length)
    for (const reflection of cosmosDailyReflections) {
      expect(reflection.id).toMatch(/^[a-z-]+$/)
      expect(reflection.text.trim().length).toBeGreaterThan(10)
      expect(reflection.text.endsWith('？')).toBe(true)
    }
  })

  it('selects one stable prompt from local calendar fields for the whole day', () => {
    const morning = new Date(2026, 9, 12, 0, 1)
    const evening = new Date(2026, 9, 12, 23, 59)
    const nextDay = new Date(2026, 9, 13, 0, 1)
    expect(cosmosReflectionForLocalDate(morning)).toBe(cosmosReflectionForLocalDate(evening))
    expect(cosmosReflectionForLocalDate(nextDay)).not.toBe(cosmosReflectionForLocalDate(morning))
  })

  it('rejects unusable inputs', () => {
    expect(() => cosmosReflectionForLocalDate(new Date(Number.NaN))).toThrow(RangeError)
    expect(() => cosmosReflectionForLocalDate(new Date(2026, 0, 1), [])).toThrow(RangeError)
  })
})
