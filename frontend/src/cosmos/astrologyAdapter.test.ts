import { describe, expect, it } from 'vitest'
import { calculateAngles, calculateDateOnlyNatal, calculateExactNatal, calculateSunSignForDate, geocentricTropicalLongitude } from './astrologyAdapter'

const GREENWICH_JPL_LONGITUDES = {
  sun: 279.8592049, moon: 217.2933209, mercury: 271.1117994, venus: 240.9614017, mars: 327.5754592,
  jupiter: 25.2331157, saturn: 40.40585, uranus: 314.7840584, neptune: 303.175242, pluto: 251.4371568,
} as const

describe('local Western natal calculation', () => {
  it('matches independent JPL Horizons geocentric ecliptic reference longitudes at J2000', () => {
    const date = new Date('2000-01-01T00:00:00Z')
    for (const [planet, expected] of Object.entries(GREENWICH_JPL_LONGITUDES)) {
      const actual = geocentricTropicalLongitude(planet as keyof typeof GREENWICH_JPL_LONGITUDES, date)
      const tolerance = planet === 'moon' ? 0.02 : 0.01
      expect(Math.abs(actual - expected), planet).toBeLessThan(tolerance)
    }
  })

  it.each([
    ['Greenwich J2000', '2000-01-01T00:00:00Z', 51.4769, 0, 187.0305813, 99.1581415],
    ['Honolulu reference', '1961-08-05T05:24:00Z', 21.3, -157.8667, 318.0445697, 238.8853493],
    ['Tokyo reference', '1990-04-28T21:00:00Z', 35.6762, 139.6503, 58.4574105, 308.7905612],
  ] as const)('matches independent reference angles for %s', (_name, iso, latitude, longitude, ascendant, midheaven) => {
    const actual = calculateAngles(new Date(iso), latitude, longitude)
    expect(Math.abs(actual.ascendant - ascendant)).toBeLessThan(0.01)
    expect(Math.abs(actual.midheaven - midheaven)).toBeLessThan(0.01)
  })

  it('produces exact placements, angles, Whole Sign houses, and aspects when inputs support them', () => {
    const chart = calculateExactNatal(Date.parse('1990-04-28T21:00:00Z'), { latitude: 35.6762, longitude: 139.6503 })
    expect(chart.placements).toHaveLength(10)
    expect(chart.houses).toHaveLength(12)
    expect(chart.placements.every(({ house }) => house !== null && house >= 1 && house <= 12)).toBe(true)
    expect(chart.aspects.every(({ first, second }) => first !== second)).toBe(true)
  })

  it('omits angles and houses when coordinates are unknown', () => {
    const chart = calculateExactNatal(Date.parse('2000-01-01T00:00:00Z'))
    expect(chart.ascendant).toBeNull()
    expect(chart.midheaven).toBeNull()
    expect(chart.houses).toEqual([])
    expect(chart.placements.every(({ house }) => house === null)).toBe(true)
  })

  it('never fabricates a time for a date-only chart and marks sign transitions uncertain', () => {
    const chart = calculateDateOnlyNatal('2024-01-03', 'Asia/Kuala_Lumpur')
    expect(chart.kind).toBe('date-only')
    expect(chart.ascendant).toBeNull()
    expect(chart.houses).toEqual([])
    expect(chart.aspects).toEqual([])
    expect(chart.placements.find(({ id }) => id === 'moon')?.possibleSigns).toEqual(['virgo', 'libra'])
    expect(chart.placements.find(({ id }) => id === 'sun')?.possibleSigns).toEqual(['capricorn'])
  })

  it('uses calculated solar longitude to surface a Sun Sign boundary day', () => {
    expect(calculateSunSignForDate('2024-03-20', 'Asia/Kuala_Lumpur')).toEqual(['pisces', 'aries'])
  })
})
