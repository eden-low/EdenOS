import { describe, expect, it } from 'vitest'
import { ZIWEI_HOURS, parseZiWeiTime, validateZiWeiDate, ziWeiHourLabel, ziWeiTimeIndex } from './ziweiTime'

describe('Zi Wei civil-time mapping', () => {
  it('maps early Zi, every two-hour branch, and late Zi to iztro indices', () => {
    const cases: [string, number][] = [
      ['00:00', 0], ['00:59', 0], ['01:00', 1], ['02:59', 1], ['03:00', 2], ['04:59', 2],
      ['05:00', 3], ['07:00', 4], ['09:00', 5], ['11:00', 6], ['13:00', 7], ['15:00', 8],
      ['17:00', 9], ['19:00', 10], ['21:00', 11], ['22:59', 11], ['23:00', 12], ['23:59', 12],
    ]
    for (const [time, expected] of cases) expect(ziWeiTimeIndex(time)).toBe(expected)
    expect(ZIWEI_HOURS).toHaveLength(13)
    expect(ziWeiHourLabel(0)).toContain('早子时')
    expect(ziWeiHourLabel(12)).toContain('晚子时')
  })

  it('rejects invalid clock values', () => {
    expect(parseZiWeiTime('24:00')).toBeNull()
    expect(parseZiWeiTime('12:60')).toBeNull()
    expect(parseZiWeiTime('9:00')).toBeNull()
    expect(() => ziWeiTimeIndex('')).toThrow()
  })

  it('validates real Gregorian dates and the supported range', () => {
    expect(validateZiWeiDate('2024-02-29', '2026-10-13')).toBeNull()
    expect(validateZiWeiDate('2023-02-29', '2026-10-13')).toContain('有效')
    expect(validateZiWeiDate('1969-12-31', '2026-10-13')).toContain('1970-01-01')
    expect(validateZiWeiDate('2027-01-01', '2026-10-13')).toContain('不能晚于今天')
  })
})
