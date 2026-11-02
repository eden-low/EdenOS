// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createOpenWeatherProvider, normalizeOpenWeatherResponse, OpenWeatherProviderError } from './openWeatherProvider'

const response = {
  weather: [{ id: 802, description: 'scattered clouds' }],
  main: { temp: 30.4, temp_min: 29.8, temp_max: 31.2 },
  dt: 1_779_000_000,
}

describe('OpenWeather provider', () => {
  it('normalizes the official Current Weather fields', () => {
    expect(normalizeOpenWeatherResponse(response)).toEqual({
      temperatureC: 30.4,
      condition: { label: 'Partly cloudy', kind: 'partly-cloudy' },
      highC: 31.2,
      lowC: 29.8,
      observedAt: new Date(response.dt * 1000).toISOString(),
      provider: 'openweather',
    })
  })

  it('queries Current Weather by coordinates in Celsius without exposing the key in its result', async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => (
      { ok: true, status: 200, json: async () => response } as Response
    ))
    const weather = await createOpenWeatherProvider('test-only-key', fetcher).current(3.14, 101.69)
    const url = new URL(fetcher.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.openweathermap.org/data/2.5/weather')
    expect(url.searchParams.get('lat')).toBe('3.14')
    expect(url.searchParams.get('lon')).toBe('101.69')
    expect(url.searchParams.get('units')).toBe('metric')
    expect(url.searchParams.has('appid')).toBe(true)
    expect(JSON.stringify(weather)).not.toContain('test-only-key')
  })

  it.each([
    [401, 'authentication'], [429, 'quota'], [500, 'provider'],
  ] as const)('classifies upstream HTTP %i safely', async (status, code) => {
    const provider = createOpenWeatherProvider('test-only-key', async () => ({ ok: false, status } as Response))
    await expect(provider.current(3.14, 101.69)).rejects.toMatchObject({ code } satisfies Partial<OpenWeatherProviderError>)
  })

  it('times out an unresponsive upstream request', async () => {
    vi.useFakeTimers()
    try {
      const provider = createOpenWeatherProvider('test-only-key', (_input, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }), 100)
      const pending = provider.current(3.14, 101.69)
      const rejection = expect(pending).rejects.toMatchObject({ code: 'timeout' })
      await vi.advanceTimersByTimeAsync(100)
      await rejection
    } finally {
      vi.useRealTimers()
    }
  })
})
