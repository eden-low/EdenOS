import { describe, expect, it } from 'vitest'
import {
  addLocalWeeks,
  combineLocalDateTime,
  isSameLocalDay,
  isSameLocalMonth,
  localDateKey,
  relativeDayLabel,
  startOfLocalWeek,
  toLocalDateInput,
} from './date'

describe('local dates', () => {
  it('combines form inputs in local time and rejects normalized invalid dates', () => {
    const local = new Date(2026, 8, 17, 0, 15)
    expect(combineLocalDateTime('2026-09-17', '00:15')).toBe(local.toISOString())
    expect(combineLocalDateTime('2026-02-30', '12:00')).toBeNull()
    expect(combineLocalDateTime('2026-09-17', '24:00')).toBeNull()
  })

  it('classifies Today and Yesterday across local midnight', () => {
    const today = new Date(2026, 8, 17, 0, 15)
    const yesterday = new Date(2026, 8, 16, 23, 45)
    expect(relativeDayLabel(today.toISOString(), today)).toBe('Today')
    expect(relativeDayLabel(yesterday.toISOString(), today)).toBe('Yesterday')
    expect(isSameLocalDay(today, yesterday)).toBe(false)
    expect(localDateKey(today)).toBe(toLocalDateInput(today))
  })

  it('uses local calendar months at the boundary', () => {
    const septemberStart = new Date(2026, 8, 1, 0, 0)
    expect(isSameLocalMonth(septemberStart, new Date(2026, 8, 30, 23, 59))).toBe(true)
    expect(isSameLocalMonth(septemberStart, new Date(2026, 7, 31, 23, 59))).toBe(false)
  })

  it('starts weeks on local Monday and advances by local calendar days', () => {
    const sunday = new Date(2027, 0, 3, 23, 59)
    const weekStart = startOfLocalWeek(sunday)
    expect(weekStart).toEqual(new Date(2026, 11, 28, 0, 0))
    expect(addLocalWeeks(weekStart, 1)).toEqual(new Date(2027, 0, 4, 0, 0))
    expect(sunday).toEqual(new Date(2027, 0, 3, 23, 59))
  })
})
