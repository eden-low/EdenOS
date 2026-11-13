import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00Z')) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const valid = { base: 'USD', quote: 'MYR', rate: 4.5, date: '2026-11-13' }
async function setup(response: unknown = valid, ok = true) {
  const fetchMock = vi.fn(async (_url: string, _options?: RequestInit) => ({ ok, json: async () => response }))
  vi.stubGlobal('fetch', fetchMock)
  const { getReferenceRate } = await import('./exchangeRates')
  return { fetchMock, getReferenceRate }
}
describe('Frankfurter v2 reference rate contract', () => {
  it('handles Malaysia midnight ahead of the UTC publication day', async () => {
    vi.setSystemTime(new Date('2026-11-13T18:00:00Z'))
    vi.spyOn(await import('../lib/date'), 'toLocalDateInput').mockReturnValue('2026-11-14')
    const { fetchMock, getReferenceRate } = await setup()
    await expect(getReferenceRate('USD', '2026-11-14')).resolves.toMatchObject({ date: '2026-11-13' })
    expect(fetchMock.mock.calls[0][0]).toContain('?date=2026-11-13')
  })
  it('uses CORS GET without sending user amounts, credentials or referrer; caches and deduplicates requests', async () => {
    const { fetchMock, getReferenceRate } = await setup()
    const [first, second] = await Promise.all([getReferenceRate('USD'), getReferenceRate('USD')])
    expect(first).toEqual({ ...valid, rate: '4.5' }); expect(second).toEqual(first)
    await getReferenceRate('USD')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('https://api.frankfurter.dev/v2/rate/USD/MYR', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }))
  })
  it('queries the consumption date and expires the memory cache after one hour', async () => {
    const { fetchMock, getReferenceRate } = await setup()
    await getReferenceRate('USD', '2026-11-14')
    expect(fetchMock.mock.calls[0][0]).toContain('?date=2026-11-14')
    vi.advanceTimersByTime(3600001)
    await getReferenceRate('USD', '2026-11-14')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it.each([
    null, { ...valid, base: 'EUR' }, { ...valid, quote: 'USD' }, { ...valid, rate: -1 },
    { ...valid, rate: '4.5' }, { ...valid, rate: Infinity }, { ...valid, date: '2026-10-01' },
    { ...valid, date: '2026-11-15' }, { ...valid, date: '2026-02-30' },
  ])('rejects invalid, mismatched, stale or future data %j', async (data) => {
    const { getReferenceRate } = await setup(data)
    await expect(getReferenceRate('USD')).rejects.toThrow()
  })
  it('rejects unsupported currencies, future dates and HTTP errors', async () => {
    const { fetchMock, getReferenceRate } = await setup(valid, false)
    await expect(getReferenceRate('XYZ')).rejects.toThrow('Unsupported')
    await expect(getReferenceRate('USD', '2026-11-15')).rejects.toThrow('valid')
    expect(fetchMock).not.toHaveBeenCalled()
    await expect(getReferenceRate('USD')).rejects.toThrow('unavailable')
  })
  it('clears failures so that a manual retry can succeed', async () => {
    const { fetchMock, getReferenceRate } = await setup()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(getReferenceRate('USD')).rejects.toThrow('offline')
    await expect(getReferenceRate('USD')).resolves.toMatchObject({ rate: '4.5' })
  })
})
