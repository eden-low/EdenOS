import { describe, expect, it } from 'vitest'
import { calculateAspects, shortestAngularDistance } from './astrologyAspects'

describe('major astrology aspects', () => {
  it('uses shortest angular distance across the 0°/360° boundary', () => {
    expect(shortestAngularDistance(359, 1)).toBe(2)
    expect(shortestAngularDistance(10, 350)).toBe(20)
  })

  it('detects all five aspects at exact angles without duplicate unordered pairs', () => {
    const aspects = calculateAspects([
      { id: 'sun', longitude: 0 }, { id: 'moon', longitude: 1 },
      { id: 'mercury', longitude: 60 }, { id: 'venus', longitude: 90 },
      { id: 'mars', longitude: 120 }, { id: 'jupiter', longitude: 180 },
    ])
    const sunAspects = aspects.filter(({ first }) => first === 'sun')
    expect(sunAspects.map(({ type }) => type)).toEqual(['conjunction', 'sextile', 'square', 'trine', 'opposition'])
    expect(new Set(aspects.map(({ first, second }) => [first, second].sort().join('-'))).size).toBe(aspects.length)
  })

  it('includes the orb boundary and excludes a result beyond it', () => {
    expect(calculateAspects([{ id: 'sun', longitude: 0 }, { id: 'moon', longitude: 8 }])[0].type).toBe('conjunction')
    expect(calculateAspects([{ id: 'sun', longitude: 0 }, { id: 'moon', longitude: 8.01 }])).toHaveLength(0)
    expect(calculateAspects([{ id: 'sun', longitude: 359 }, { id: 'moon', longitude: 1 }])[0].type).toBe('conjunction')
  })
})
