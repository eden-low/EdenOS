import { describe, expect, it } from 'vitest'
import { PLANETS, ZODIAC_SIGNS, normalizeLongitude, zodiacForLongitude } from './astrologyData'

describe('Western zodiac reference data', () => {
  it('contains 12 unique tropical signs in longitude order', () => {
    expect(ZODIAC_SIGNS).toHaveLength(12)
    expect(new Set(ZODIAC_SIGNS.map(({ id }) => id)).size).toBe(12)
    expect(ZODIAC_SIGNS.map(({ english }) => english)).toEqual(['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'])
    for (const sign of ZODIAC_SIGNS) expect(sign.symbolism).toContain('象征')
  })

  it('contains the ten requested unique planets', () => {
    expect(PLANETS).toHaveLength(10)
    expect(new Set(PLANETS.map(({ id }) => id)).size).toBe(10)
  })

  it.each([
    [0, 'aries', 0], [29.999, 'aries', 29.999], [30, 'taurus', 0],
    [359.999, 'pisces', 29.999], [360, 'aries', 0], [-0.5, 'pisces', 29.5],
  ] as const)('maps longitude %s to %s', (longitude, sign, degree) => {
    const result = zodiacForLongitude(longitude)
    expect(result.sign.id).toBe(sign)
    expect(result.degree).toBeCloseTo(degree, 6)
  })

  it('normalizes arbitrary longitudes into 0° through less than 360°', () => {
    expect(normalizeLongitude(721)).toBe(1)
    expect(normalizeLongitude(-361)).toBe(359)
  })
})
