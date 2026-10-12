import { describe, expect, it } from 'vitest'
import { analyzeBaZi } from './baziAnalysis'
import { calculateBaZi } from './baziAdapter'

describe('BaZi local analysis', () => {
  const latestDate = '2026-10-12'

  it('identifies the Day Master and Ten Gods from available Heavenly Stems', () => {
    const analysis = analyzeBaZi(calculateBaZi({ date: '1990-05-15', timeKnown: true, time: '10:00' }, latestDate))
    expect(analysis.dayMaster.character).toBe('庚')
    expect(analysis.tenGods).toEqual([
      { pillar: 'year', label: '比肩' },
      { pillar: 'month', label: '劫财' },
      { pillar: 'day', label: '日主' },
      { pillar: 'hour', label: '劫财' },
    ])
  })

  it('counts only the eight explicitly displayed stem and branch characters', () => {
    const analysis = analyzeBaZi(calculateBaZi({ date: '1990-05-15', timeKnown: true, time: '10:00' }, latestDate))
    expect(analysis.visibleElements).toEqual({ wood: 0, fire: 3, earth: 1, metal: 4, water: 0 })
    expect(analysis.visibleCharacterCount).toBe(8)
  })

  it('excludes the missing hour stem and branch from unknown-time analysis', () => {
    const analysis = analyzeBaZi(calculateBaZi({ date: '1990-05-15', timeKnown: false }, latestDate))
    expect(analysis.visibleElements).toEqual({ wood: 0, fire: 2, earth: 1, metal: 3, water: 0 })
    expect(analysis.visibleCharacterCount).toBe(6)
    expect(analysis.tenGods.map(({ pillar }) => pillar)).toEqual(['year', 'month', 'day'])
  })
})
