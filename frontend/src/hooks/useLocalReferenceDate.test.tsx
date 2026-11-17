import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from './useLocalReferenceDate'

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('local calendar refresh', () => {
  it.each([11, 17, 23])('refreshes at the next local boundary after %s:59:59', (hour) => {
    vi.setSystemTime(new Date(2026, 8, 17, hour, 59, 59))
    const { result, unmount } = renderHook(useLocalReferenceDate)
    act(() => { vi.advanceTimersByTime(1100) })
    expect(result.current.getHours()).toBe((hour + 1) % 24)
    expect(result.current.getDate()).toBe(hour === 23 ? 18 : 17)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('catches up after background suspension without requiring a data event', () => {
    vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    const { result, unmount } = renderHook(useLocalReferenceDate)
    vi.setSystemTime(new Date(2027, 0, 1, 8))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(result.current.getFullYear()).toBe(2026)
    visibility.mockReturnValue('visible')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(result.current.getFullYear()).toBe(2027)
    expect(result.current.getDate()).toBe(1)
    expect(result.current.getHours()).toBe(8)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
