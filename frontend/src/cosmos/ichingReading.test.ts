import { describe, expect, it } from 'vitest'
import { createIChingReading, createIChingReflection, movingLineLabel } from './ichingReading'

describe('I Ching reading construction and transformation', () => {
  it('uses the first toss as the bottom line and extracts lower then upper trigrams', () => {
    const reading = createIChingReading([7, 7, 7, 8, 8, 8])
    expect(reading.primary).toMatchObject({ number: 11, name: '泰' })
    expect(reading.lowerTrigram.name).toBe('乾')
    expect(reading.upperTrigram.name).toBe('坤')
  })

  it('keeps a hexagram unchanged when there are no moving lines', () => {
    const reading = createIChingReading([7, 7, 7, 7, 7, 7])
    expect(reading.movingLines).toEqual([])
    expect(reading.primary.number).toBe(1)
    expect(reading.relating.number).toBe(1)
    expect(createIChingReflection(reading)).toContain('变卦与本卦相同')
  })

  it('changes one moving old-yang line', () => {
    const reading = createIChingReading([9, 7, 7, 7, 7, 7])
    expect(reading.movingLines).toEqual([1])
    expect(reading.primary.number).toBe(1)
    expect(reading.relating).toMatchObject({ number: 44, name: '姤' })
  })

  it('changes multiple moving lines into the correct known relating hexagram', () => {
    const reading = createIChingReading([6, 9, 7, 8, 6, 9])
    expect(reading.primary).toMatchObject({ number: 18, name: '蛊' })
    expect(reading.relating).toMatchObject({ number: 63, name: '既济' })
    expect(reading.movingLines).toEqual([1, 2, 5, 6])
  })

  it('changes all six lines from 乾 to 坤', () => {
    const reading = createIChingReading([9, 9, 9, 9, 9, 9])
    expect(reading.primary.number).toBe(1)
    expect(reading.relating.number).toBe(2)
    expect(reading.movingLines).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('requires exactly six valid values and labels line positions', () => {
    expect(() => createIChingReading([7, 7, 7])).toThrow(RangeError)
    expect(movingLineLabel(1)).toBe('初爻')
    expect(movingLineLabel(6)).toBe('上爻')
  })
})
