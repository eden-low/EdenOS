import { describe, expect, it } from 'vitest'
import { dateInTimeZone, describeTimeZone, isValidIanaTimeZone, resolveZonedDateTime, utcRangeForLocalDate, validateAstrologyDate } from './astrologyTime'

describe('IANA birth-time conversion', () => {
  it.each(['Asia/Kuala_Lumpur', 'Europe/London', 'America/New_York', 'UTC'])('accepts IANA zone %s', (zone) => {
    expect(isValidIanaTimeZone(zone)).toBe(true)
  })

  it('converts modern Malaysia local time to UTC', () => {
    const result = resolveZonedDateTime({ date: '1990-04-29', time: '05:00', timeZone: 'Asia/Kuala_Lumpur' })
    expect(result.status).toBe('valid')
    if (result.status === 'valid') expect(result.candidate.isoUtc).toBe('1990-04-28T21:00:00.000Z')
  })

  it('rejects a nonexistent DST spring-forward time', () => {
    expect(resolveZonedDateTime({ date: '2024-03-10', time: '02:30', timeZone: 'America/New_York' }).status).toBe('nonexistent')
  })

  it('returns both offset choices for an ambiguous DST fall-back time', () => {
    const result = resolveZonedDateTime({ date: '2024-11-03', time: '01:30', timeZone: 'America/New_York' })
    expect(result.status).toBe('ambiguous')
    if (result.status === 'ambiguous') expect(result.candidates.map(({ offsetLabel }) => offsetLabel)).toEqual(['UTC-04:00', 'UTC-05:00'])
  })

  it('describes the historical offset at the selected birth date and time', () => {
    expect(describeTimeZone('Asia/Kuala_Lumpur', '1990-04-29', '05:00')).toMatchObject({ names: ['Malaysia Time'], offsets: ['UTC+08:00'] })
    expect(describeTimeZone('America/New_York', '2000-01-15', '12:00')).toMatchObject({ names: ['Eastern Standard Time'], offsets: ['UTC-05:00'] })
    expect(describeTimeZone('America/New_York', '2000-07-15', '12:00')).toMatchObject({ names: ['Eastern Daylight Time'], offsets: ['UTC-04:00'] })
  })

  it('describes both historical offsets for an ambiguous birth time', () => {
    expect(describeTimeZone('America/New_York', '2024-11-03', '01:30')).toMatchObject({ status: 'ambiguous', offsets: ['UTC-04:00', 'UTC-05:00'] })
  })

  it('finds the exact UTC span of local dates with positive and negative offsets', () => {
    expect(utcRangeForLocalDate('2024-01-01', 'Asia/Kuala_Lumpur')).toEqual({ startMs: Date.parse('2023-12-31T16:00:00Z'), endMs: Date.parse('2024-01-01T15:59:00Z') })
    expect(utcRangeForLocalDate('2024-01-01', 'America/New_York')).toEqual({ startMs: Date.parse('2024-01-01T05:00:00Z'), endMs: Date.parse('2024-01-02T04:59:00Z') })
  })

  it('validates leap days, impossible dates, range limits, and local today', () => {
    expect(validateAstrologyDate('2024-02-29', '2025-01-01')).toBeNull()
    expect(validateAstrologyDate('2023-02-29', '2025-01-01')).toContain('有效')
    expect(validateAstrologyDate('1969-12-31', '2025-01-01')).toContain('1970')
    expect(validateAstrologyDate('2026-01-01', '2025-01-01')).toContain('今天')
    expect(dateInTimeZone(new Date('2024-01-01T23:30:00Z'), 'Asia/Kuala_Lumpur')).toBe('2024-01-02')
  })
})
