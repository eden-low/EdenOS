import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cachedWeather, loadWeather, normalizeOpenMeteoResponse, readWeatherSession,
  legacyWeatherSessionKey, rememberWeatherLocation, requestWeatherLocation, weatherCacheTtlMs,
  weatherSessionStorageKey,
  weatherConditionForCode, type WeatherLocation,
} from './weather'

const location: WeatherLocation = { latitude: 3.14, longitude: 101.69 }
const response = {
  current: { time: '2026-09-18T14:15', temperature_2m: 30.4, weather_code: 2 },
  daily: {
    time: ['2026-09-18'],
    temperature_2m_max: [33.2],
    temperature_2m_min: [25.1],
    precipitation_probability_max: [45],
  },
}
const now = new Date(2026, 8, 18, 14, 20).getTime()
const uid = 'user-a'

function api(value: unknown = response): Response {
  return { ok: true, json: async () => value } as Response
}

beforeEach(() => sessionStorage.clear())

describe('Open-Meteo adapter', () => {
  it('normalizes current temperature, condition, daily high/low, and optional rain probability', () => {
    expect(normalizeOpenMeteoResponse(response)).toEqual({
      temperatureC: 30.4,
      condition: { label: 'Partly cloudy', kind: 'partly-cloudy' },
      highC: 33.2,
      lowC: 25.1,
      precipitationProbability: 45,
      observedAt: '2026-09-18T14:15',
      provider: 'open-meteo',
    })
    const withoutProbability = normalizeOpenMeteoResponse({
      ...response, daily: { ...response.daily, precipitation_probability_max: [null] },
    })
    expect(withoutProbability).toBeTruthy()
    expect(withoutProbability?.precipitationProbability).toBeUndefined()
  })

  it.each([
    [0, 'Clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [45, 'Fog'],
    [51, 'Drizzle'], [61, 'Rain'], [71, 'Snow'], [80, 'Showers'], [85, 'Snow showers'], [95, 'Thunderstorm'],
    [999, 'Conditions unavailable'],
  ])('maps WMO code %i to %s', (code, label) => {
    expect(weatherConditionForCode(code).label).toBe(label)
  })

  it('rejects malformed data and uses a neutral label for an unknown code', () => {
    expect(normalizeOpenMeteoResponse({ ...response, current: { ...response.current, temperature_2m: 'hot' } })).toBeNull()
    expect(normalizeOpenMeteoResponse({ ...response, daily: { ...response.daily, temperature_2m_max: [] } })).toBeNull()
    expect(normalizeOpenMeteoResponse({ ...response, daily: { ...response.daily, temperature_2m_min: [40] } })).toBeNull()
    expect(normalizeOpenMeteoResponse({ ...response, current: { ...response.current, weather_code: 999 } })?.condition.kind).toBe('unknown')
  })

  it('requests only V1 fields, caches for 20 minutes, then refreshes', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => api())
    const first = await loadWeather(sessionStorage, uid, location, fetcher, now)
    expect(first?.temperatureC).toBe(30.4)
    expect(await loadWeather(sessionStorage, uid, location, fetcher, now + weatherCacheTtlMs - 1)).toEqual(first)
    expect(fetcher).toHaveBeenCalledTimes(1)
    const url = new URL(fetcher.mock.calls[0][0])
    expect(url.host).toBe('api.open-meteo.com')
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code')
    expect(url.searchParams.get('daily')).toBe('temperature_2m_max,temperature_2m_min,precipitation_probability_max')
    expect(url.searchParams.get('forecast_days')).toBe('1')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.has('apikey')).toBe(false)
    await loadWeather(sessionStorage, uid, location, fetcher, now + weatherCacheTtlMs)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('uses recent cached data on provider failure and slows retry', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    await loadWeather(sessionStorage, uid, location, async () => api(), now)
    const failing = vi.fn(async () => { throw new Error('network') })
    const later = now + weatherCacheTtlMs
    expect((await loadWeather(sessionStorage, uid, location, failing, later))?.temperatureC).toBe(30.4)
    expect(cachedWeather(sessionStorage, uid, later)?.temperatureC).toBe(30.4)
    expect((await loadWeather(sessionStorage, uid, location, failing, later + 1000))?.temperatureC).toBe(30.4)
    expect(failing).toHaveBeenCalledTimes(1)
  })

  it('does not reuse an old daily high and low after the local date changes', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const late = new Date(2026, 8, 18, 23, 55).getTime()
    await loadWeather(sessionStorage, uid, location, async () => api(), late)
    const nextDay = new Date(2026, 8, 19, 0, 5).getTime()
    const fetcher = vi.fn(async () => { throw new Error('offline') })
    expect(await loadWeather(sessionStorage, uid, location, fetcher, nextDay)).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('returns unavailable for network failure or malformed response without cache', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    expect(await loadWeather(sessionStorage, uid, location, async () => { throw new Error('offline') }, now)).toBeNull()
    sessionStorage.clear()
    rememberWeatherLocation(sessionStorage, uid, location)
    expect(await loadWeather(sessionStorage, uid, location, async () => api({ bad: true }), now)).toBeNull()
  })

  it('keeps rounded coordinates in session storage only after an explicit location result', async () => {
    expect(readWeatherSession(sessionStorage, uid)).toBeNull()
    const geolocation = { getCurrentPosition: vi.fn((success: PositionCallback) => success({
      coords: { latitude: 3.14159, longitude: 101.69123 },
    } as GeolocationPosition)) } as unknown as Geolocation
    const precise = await requestWeatherLocation(geolocation)
    expect(precise.latitude).toBe(3.14159)
    expect(rememberWeatherLocation(sessionStorage, uid, precise)).toEqual(location)
    expect(readWeatherSession(sessionStorage, uid)?.location).toEqual(location)
    expect(localStorage.length).toBe(0)
  })

  it('handles denied permission and missing geolocation', async () => {
    const denied = { getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error({ code: 1 } as GeolocationPositionError)) } as unknown as Geolocation
    await expect(requestWeatherLocation(denied)).rejects.toBe('denied')
    await expect(requestWeatherLocation(undefined)).rejects.toBe('unavailable')
    expect(readWeatherSession(sessionStorage, uid)).toBeNull()
  })

  it('uses OpenWeather first and does not call Open-Meteo after a valid primary response', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const openWeather = {
      temperatureC: 29.5, condition: { label: 'Clear', kind: 'clear' as const }, highC: 30, lowC: 29,
      observedAt: '2026-09-18T06:20:00.000Z', provider: 'openweather' as const,
    }
    const primary = vi.fn(async () => openWeather)
    const fallback = vi.fn(async () => api())
    expect(await loadWeather(sessionStorage, uid, location, fallback, now, undefined, primary)).toEqual(openWeather)
    expect(primary).toHaveBeenCalledWith(location, expect.any(AbortSignal))
    expect(fallback).not.toHaveBeenCalled()
  })

  it.each(['missing-key', '401', '429', '500', 'timeout'])('falls back to Open-Meteo after OpenWeather %s', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const primary = vi.fn(async () => { throw new Error('OpenWeather unavailable') })
    const fallback = vi.fn(async () => api())
    const result = await loadWeather(sessionStorage, uid, location, fallback, now, undefined, primary)
    expect(result?.provider).toBe('open-meteo')
    expect(result?.temperatureC).toBe(30.4)
    expect(primary).toHaveBeenCalledOnce()
    expect(fallback).toHaveBeenCalledOnce()
  })

  it('aborts a hanging OpenWeather request and still falls back within the overall timeout', async () => {
    vi.useFakeTimers()
    try {
      rememberWeatherLocation(sessionStorage, uid, location)
      const primary = vi.fn((_location: WeatherLocation, signal?: AbortSignal) => new Promise<never>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      }))
      const fallback = vi.fn(async () => api())
      const pending = loadWeather(sessionStorage, uid, location, fallback, now, undefined, primary)
      await vi.advanceTimersByTimeAsync(5_000)
      expect((await pending)?.provider).toBe('open-meteo')
      expect(fallback).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('isolates cached coordinates and weather by Firebase UID and ignores the legacy global key', async () => {
    sessionStorage.setItem(legacyWeatherSessionKey, JSON.stringify({ location, weather: null, fetchedAt: null, failedAt: null }))
    rememberWeatherLocation(sessionStorage, 'user-a', location)
    await loadWeather(sessionStorage, 'user-a', location, async () => api(), now)

    expect(readWeatherSession(sessionStorage, 'user-a')?.weather?.temperatureC).toBe(30.4)
    expect(readWeatherSession(sessionStorage, 'user-b')).toBeNull()
    expect(readWeatherSession(sessionStorage, 'guest-uid')).toBeNull()
    expect(sessionStorage.getItem(legacyWeatherSessionKey)).not.toBeNull()
    expect(sessionStorage.getItem(weatherSessionStorageKey('user-a'))).not.toBeNull()
  })

  it.each([429, 500])('degrades safely when the provider returns HTTP %i', async (status) => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const fetcher = vi.fn(async () => ({ ok: false, status } as Response))
    expect(await loadWeather(sessionStorage, uid, location, fetcher, now)).toBeNull()
  })

  it('cancels an in-flight request without writing a failure or result cache', async () => {
    rememberWeatherLocation(sessionStorage, uid, location)
    const controller = new AbortController()
    const fetcher = vi.fn((_input: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    }))
    const pending = loadWeather(sessionStorage, uid, location, fetcher, now, controller.signal)
    controller.abort()
    expect(await pending).toBeNull()
    expect(readWeatherSession(sessionStorage, uid)?.failedAt).toBeNull()
  })

  it('times out safely and records a retry delay without exposing an exception', async () => {
    vi.useFakeTimers()
    try {
      rememberWeatherLocation(sessionStorage, uid, location)
      const fetcher = vi.fn((_input: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true })
      }))
      const pending = loadWeather(sessionStorage, uid, location, fetcher, now)
      await vi.advanceTimersByTimeAsync(8_000)
      expect(await pending).toBeNull()
      expect(readWeatherSession(sessionStorage, uid)?.failedAt).toBe(now)
    } finally {
      vi.useRealTimers()
    }
  })
})
