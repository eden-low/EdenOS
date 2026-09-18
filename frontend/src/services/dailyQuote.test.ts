import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cachedDailyQuote, dailyQuoteCacheKey, loadDailyQuote, parseDailyQuote, quoteCategories } from './dailyQuote'

const response = {
  uuid: '75a45fd4-4f2f-45eb-80cb-6f0a7bcdfaf2',
  hitokoto: 'A little room to think.',
  type: 'd',
  from: 'A book',
  from_who: 'An author',
  length: 23,
}

function api(value: unknown = response): Response {
  return { ok: true, json: async () => value } as Response
}

beforeEach(() => localStorage.clear())

describe('Daily Quote', () => {
  it('validates the public V1 response and selected categories', () => {
    expect(parseDailyQuote(response)).toMatchObject({ text: response.hitokoto, uuid: response.uuid })
    expect(quoteCategories).toEqual(['d', 'e', 'i', 'k'])
    expect(parseDailyQuote({ ...response, hitokoto: '' })).toBeNull()
    expect(parseDailyQuote({ ...response, type: 'l' })).toBeNull()
    expect(parseDailyQuote({ ...response, uuid: 'not-a-uuid' })).toBeNull()
    expect(parseDailyQuote({ ...response, hitokoto: 'x'.repeat(41) })).toBeNull()
    expect(parseDailyQuote({ ...response, from_who: null })?.author).toBeNull()
    expect(parseDailyQuote({ ...response, from: null })?.source).toBeNull()
  })

  it('uses one quote per local date, including after refresh, then fetches on the next date', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => api())
    const today = new Date(2026, 8, 18, 23, 30)
    const sameDay = new Date(2026, 8, 18, 1, 0)
    const tomorrow = new Date(2026, 8, 19, 0, 1)
    const first = await loadDailyQuote(localStorage, today, fetcher)
    expect(first?.text).toBe(response.hitokoto)
    expect(cachedDailyQuote(localStorage, sameDay)).toEqual(first)
    expect(await loadDailyQuote(localStorage, sameDay, fetcher)).toEqual(first)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(dailyQuoteCacheKey)).toContain('2026-09-18')
    expect(cachedDailyQuote(localStorage, tomorrow)).toBeNull()
    await loadDailyQuote(localStorage, tomorrow, fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('requests the intended categories and maximum length', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => api())
    await loadDailyQuote(localStorage, new Date(2026, 8, 18), fetcher)
    const url = new URL(fetcher.mock.calls[0][0])
    expect(url.host).toBe('v1.hitokoto.cn')
    expect(url.searchParams.getAll('c')).toEqual(['d', 'e', 'i', 'k'])
    expect(url.searchParams.get('max_length')).toBe('40')
  })

  it('uses stale cache on malformed response without aggressive retry', async () => {
    const yesterday = new Date(2026, 8, 17)
    await loadDailyQuote(localStorage, yesterday, async () => api())
    const today = new Date(2026, 8, 18)
    const fetcher = vi.fn(async () => api({ bad: true }))
    expect((await loadDailyQuote(localStorage, today, fetcher))?.text).toBe(response.hitokoto)
    expect((await loadDailyQuote(localStorage, today, fetcher))?.text).toBe(response.hitokoto)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(cachedDailyQuote(localStorage, today)).toBeNull()
  })

  it('handles timeout or missing cache without blocking', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeDefined()
      throw new DOMException('Timed out', 'TimeoutError')
    })
    expect(await loadDailyQuote(localStorage, new Date(2026, 8, 18), fetcher)).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('does not immediately retry a failed request after a refresh', async () => {
    const fetcher = vi.fn(async () => { throw new Error('network unavailable') })
    const today = new Date(2026, 8, 18)
    const now = Date.now()
    expect(await loadDailyQuote(localStorage, today, fetcher)).toBeNull()
    expect(await loadDailyQuote(localStorage, today, fetcher)).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60_000)
    expect(await loadDailyQuote(localStorage, today, fetcher)).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(2)
    clock.mockRestore()
  })
})
