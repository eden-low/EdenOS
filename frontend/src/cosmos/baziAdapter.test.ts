import { describe, expect, it } from 'vitest'
import { BAZI_DAY_BOUNDARY_SECT, calculateBaZi, validateBaZiInput } from './baziAdapter'

describe('BaZi calendar adapter', () => {
  const latestDate = '2026-10-12'

  it('validates real Gregorian dates, leap years, supported range, and time values', () => {
    expect(validateBaZiInput({ date: '2024-02-29', timeKnown: false }, latestDate).ok).toBe(true)
    expect(validateBaZiInput({ date: '2023-02-29', timeKnown: false }, latestDate)).toMatchObject({ ok: false })
    expect(validateBaZiInput({ date: '1981-12-31', timeKnown: false }, latestDate)).toMatchObject({ ok: false })
    expect(validateBaZiInput({ date: '2027-01-01', timeKnown: false }, latestDate)).toMatchObject({ ok: false })
    expect(validateBaZiInput({ date: '2024-01-01', timeKnown: true, time: '24:00' }, latestDate)).toMatchObject({ ok: false })
    expect(validateBaZiInput({ date: '2024-01-01', timeKnown: true, time: '09:05' }, latestDate).ok).toBe(true)
  })

  it('matches an independently published UTC+08 Four Pillars reference case', () => {
    const chart = calculateBaZi({ date: '1990-05-15', timeKnown: true, time: '10:00' }, latestDate)
    expect([chart.pillars.year?.text, chart.pillars.month?.text, chart.pillars.day?.text, chart.pillars.hour?.text]).toEqual([
      '庚午', '辛巳', '庚辰', '辛巳',
    ])
  })

  it('uses the exact Li Chun instant for both year and month boundaries', () => {
    const before = calculateBaZi({ date: '2021-02-03', timeKnown: true, time: '22:58' }, latestDate)
    const after = calculateBaZi({ date: '2021-02-03', timeKnown: true, time: '22:59' }, latestDate)
    expect([before.pillars.year?.text, before.pillars.month?.text]).toEqual(['庚子', '己丑'])
    expect([after.pillars.year?.text, after.pillars.month?.text]).toEqual(['辛丑', '庚寅'])
  })

  it('changes the month pillar at the independently published Jingzhe boundary', () => {
    const before = calculateBaZi({ date: '2024-03-05', timeKnown: true, time: '10:22' }, latestDate)
    const after = calculateBaZi({ date: '2024-03-05', timeKnown: true, time: '10:23' }, latestDate)
    expect(before.pillars.month?.text).toBe('丙寅')
    expect(after.pillars.month?.text).toBe('丁卯')
  })

  it('cross-checks the day pillar against the published 1949-10-01 Jia-Zi day anchor', () => {
    const anchorUtc = Date.UTC(1949, 9, 1)
    for (const date of ['1982-01-01', '2000-01-01', '2024-06-01']) {
      const [year, month, day] = date.split('-').map(Number)
      const elapsedDays = Math.round((Date.UTC(year, month - 1, day) - anchorUtc) / 86_400_000)
      const expectedIndex = ((elapsedDays % 60) + 60) % 60
      const stems = '甲乙丙丁戊己庚辛壬癸'
      const branches = '子丑寅卯辰巳午未申酉戌亥'
      const expected = `${stems[expectedIndex % 10]}${branches[expectedIndex % 12]}`
      expect(calculateBaZi({ date, timeKnown: true, time: '12:00' }, latestDate).pillars.day?.text).toBe(expected)
    }
  })

  it('makes the selected midnight boundary convention explicit at late Zi hour', () => {
    expect(BAZI_DAY_BOUNDARY_SECT).toBe(2)
    const beforeZi = calculateBaZi({ date: '2024-06-01', timeKnown: true, time: '22:59' }, latestDate)
    const lateZi = calculateBaZi({ date: '2024-06-01', timeKnown: true, time: '23:00' }, latestDate)
    const midnight = calculateBaZi({ date: '2024-06-02', timeKnown: true, time: '00:00' }, latestDate)
    expect(beforeZi.pillars.day?.text).toBe('丙申')
    expect(lateZi.pillars.day?.text).toBe('丙申')
    expect(lateZi.pillars.hour?.text).toBe('庚子')
    expect(midnight.pillars.day?.text).toBe('丁酉')
  })

  it('does not fabricate an hour pillar when birth time is unknown', () => {
    const chart = calculateBaZi({ date: '1990-05-15', timeKnown: false }, latestDate)
    expect([chart.pillars.year?.text, chart.pillars.month?.text, chart.pillars.day?.text]).toEqual(['庚午', '辛巳', '庚辰'])
    expect(chart.pillars.hour).toBeNull()
    expect(chart.input.time).toBeNull()
  })

  it('withholds ambiguous pillars on an unknown-time solar-term boundary date', () => {
    const chart = calculateBaZi({ date: '2021-02-03', timeKnown: false }, latestDate)
    expect(chart.pillars.year).toBeNull()
    expect(chart.pillars.month).toBeNull()
    expect(chart.pillars.day?.text).toBe('壬午')
    expect(chart.pillars.hour).toBeNull()
    expect(chart.uncertainty).toHaveLength(2)
  })
})
