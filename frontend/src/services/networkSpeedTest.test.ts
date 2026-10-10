import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runNetworkSpeedTest, speedTestDataUsageMb, SpeedTestError } from './networkSpeedTest'

describe('runNetworkSpeedTest', () => {
  beforeEach(() => { Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }) })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('runs only when called, checks exact transfer sizes, and reports all three approximate measurements', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      expect(options.credentials).toBe('omit')
      expect(options.cache).toBe('no-store')
      if (url.includes('bytes=0')) return new Response(new Uint8Array(0))
      if (url.includes('__down')) return new Response(new Uint8Array(5_000_000))
      return new Response('', { headers: { 'cf-meta-upload-bytes': '2000000' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => { now += 100; return now })
    const onResult = vi.fn()
    expect(fetchMock).not.toHaveBeenCalled()
    await runNetworkSpeedTest(new AbortController().signal, onResult)
    expect(fetchMock).toHaveBeenCalledTimes(7)
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('__up'))).toHaveLength(2)
    expect(onResult.mock.calls.map(([phase]) => phase)).toEqual(['latency', 'download', 'upload'])
    expect(onResult.mock.calls.every(([, value]) => Number.isFinite(value) && value > 0)).toBe(true)
    expect(speedTestDataUsageMb).toBe(14)
  })

  it('rejects incomplete downloads rather than reporting a fabricated speed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => new Response(new Uint8Array(url.includes('bytes=0') ? 0 : 1))))
    const onResult = vi.fn()
    await expect(runNetworkSpeedTest(new AbortController().signal, onResult)).rejects.toMatchObject({ reason: 'endpoint', phase: 'download' })
    expect(onResult.mock.calls.map(([phase]) => phase)).toEqual(['latency'])
  })

  it('rejects missing upload confirmation and preserves only completed results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => new Response(new Uint8Array(url.includes('bytes=0') ? 0 : url.includes('__down') ? 5_000_000 : 0))))
    const onResult = vi.fn()
    await expect(runNetworkSpeedTest(new AbortController().signal, onResult)).rejects.toMatchObject({ reason: 'endpoint', phase: 'upload' })
    expect(onResult.mock.calls.map(([phase]) => phase)).toEqual(['latency', 'download'])
  })

  it('stops when cancelled and does not start later measurements', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)
    const result = runNetworkSpeedTest(controller.signal, vi.fn())
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('reports offline without making a request', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(runNetworkSpeedTest(new AbortController().signal, vi.fn())).rejects.toBeInstanceOf(SpeedTestError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
