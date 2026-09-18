import { localDateKey } from '../lib/date'

// Forecast API and WMO codes: https://open-meteo.com/en/docs
export const weatherAttribution = {
  label: 'Weather data: Open-Meteo',
  url: 'https://open-meteo.com/',
} as const

export const weatherCacheTtlMs = 20 * 60_000
const staleLimitMs = 2 * 60 * 60_000
const failureRetryMs = 5 * 60_000
const timeoutMs = 8_000
const weatherSessionKey = 'edenos.weather.v1'

export type WeatherKind =
  | 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle'
  | 'rain' | 'snow' | 'showers' | 'thunderstorm' | 'unknown'

export interface WeatherCondition {
  label: string
  kind: WeatherKind
}

export interface WeatherLocation {
  latitude: number
  longitude: number
}

export interface WeatherSummary {
  temperatureC: number
  condition: WeatherCondition
  highC: number
  lowC: number
  precipitationProbability?: number
  observedAt: string
}

interface WeatherSession {
  location: WeatherLocation
  weather: WeatherSummary | null
  fetchedAt: number | null
  failedAt: number | null
}

type WeatherFetcher = (input: string, init?: RequestInit) => Promise<Response>

const codeGroups: ReadonlyArray<{ codes: readonly number[]; condition: WeatherCondition }> = [
  { codes: [0], condition: { label: 'Clear', kind: 'clear' } },
  { codes: [1, 2], condition: { label: 'Partly cloudy', kind: 'partly-cloudy' } },
  { codes: [3], condition: { label: 'Overcast', kind: 'cloudy' } },
  { codes: [45, 48], condition: { label: 'Fog', kind: 'fog' } },
  { codes: [51, 53, 55, 56, 57], condition: { label: 'Drizzle', kind: 'drizzle' } },
  { codes: [61, 63, 65, 66, 67], condition: { label: 'Rain', kind: 'rain' } },
  { codes: [71, 73, 75, 77], condition: { label: 'Snow', kind: 'snow' } },
  { codes: [80, 81, 82], condition: { label: 'Showers', kind: 'showers' } },
  { codes: [85, 86], condition: { label: 'Snow showers', kind: 'snow' } },
  { codes: [95, 96, 99], condition: { label: 'Thunderstorm', kind: 'thunderstorm' } },
]

export function weatherConditionForCode(code: unknown): WeatherCondition {
  if (typeof code !== 'number' || !Number.isInteger(code)) return { label: 'Conditions unavailable', kind: 'unknown' }
  return codeGroups.find((group) => group.codes.includes(code))?.condition ??
    { label: 'Conditions unavailable', kind: 'unknown' }
}

export function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (!value || typeof value !== 'object') return false
  const location = value as Record<string, unknown>
  return typeof location.latitude === 'number' && Number.isFinite(location.latitude) &&
    location.latitude >= -90 && location.latitude <= 90 &&
    typeof location.longitude === 'number' && Number.isFinite(location.longitude) &&
    location.longitude >= -180 && location.longitude <= 180
}

function weatherSummaryIsValid(value: unknown): value is WeatherSummary {
  if (!value || typeof value !== 'object') return false
  const weather = value as Record<string, unknown>
  const condition = weather.condition
  return typeof weather.temperatureC === 'number' && Number.isFinite(weather.temperatureC) &&
    typeof weather.highC === 'number' && Number.isFinite(weather.highC) &&
    typeof weather.lowC === 'number' && Number.isFinite(weather.lowC) &&
    weather.highC >= weather.lowC &&
    typeof weather.observedAt === 'string' && weather.observedAt.length > 0 &&
    !!condition && typeof condition === 'object' &&
    typeof (condition as WeatherCondition).label === 'string' &&
    typeof (condition as WeatherCondition).kind === 'string' &&
    (weather.precipitationProbability === undefined ||
      (typeof weather.precipitationProbability === 'number' &&
        Number.isFinite(weather.precipitationProbability) &&
        weather.precipitationProbability >= 0 && weather.precipitationProbability <= 100))
}

export function normalizeOpenMeteoResponse(value: unknown): WeatherSummary | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (!data.current || typeof data.current !== 'object' ||
      !data.daily || typeof data.daily !== 'object') return null
  const current = data.current as Record<string, unknown>
  const daily = data.daily as Record<string, unknown>
  const high = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : null
  const low = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : null
  const probability = Array.isArray(daily.precipitation_probability_max)
    ? daily.precipitation_probability_max[0] : null
  if (typeof current.temperature_2m !== 'number' || !Number.isFinite(current.temperature_2m) ||
      typeof current.weather_code !== 'number' || !Number.isInteger(current.weather_code) ||
      typeof current.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current.time) ||
      typeof high !== 'number' || !Number.isFinite(high) ||
      typeof low !== 'number' || !Number.isFinite(low) || high < low) return null
  const weather: WeatherSummary = {
    temperatureC: current.temperature_2m,
    condition: weatherConditionForCode(current.weather_code),
    highC: high,
    lowC: low,
    observedAt: current.time,
  }
  if (typeof probability === 'number' && Number.isFinite(probability) &&
      probability >= 0 && probability <= 100) weather.precipitationProbability = probability
  return weather
}

export function readWeatherSession(storage: Storage): WeatherSession | null {
  try {
    const raw = storage.getItem(weatherSessionKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const session = parsed as Record<string, unknown>
    if (!isWeatherLocation(session.location) ||
        (session.weather !== null && !weatherSummaryIsValid(session.weather)) ||
        (session.fetchedAt !== null && (typeof session.fetchedAt !== 'number' || !Number.isFinite(session.fetchedAt))) ||
        (session.failedAt !== null && (typeof session.failedAt !== 'number' || !Number.isFinite(session.failedAt)))) return null
    return session as unknown as WeatherSession
  } catch {
    return null
  }
}

function writeWeatherSession(storage: Storage, session: WeatherSession): void {
  try { storage.setItem(weatherSessionKey, JSON.stringify(session)) } catch { /* session cache is optional */ }
}

export function rememberWeatherLocation(storage: Storage, location: WeatherLocation): WeatherLocation {
  if (!isWeatherLocation(location)) throw new Error('Invalid weather location.')
  // A roughly one-kilometre location is enough for a compact forecast.
  const rounded = {
    latitude: Math.round(location.latitude * 100) / 100,
    longitude: Math.round(location.longitude * 100) / 100,
  }
  const previous = readWeatherSession(storage)
  if (previous?.location.latitude !== rounded.latitude || previous.location.longitude !== rounded.longitude) {
    writeWeatherSession(storage, { location: rounded, weather: null, fetchedAt: null, failedAt: null })
  }
  return rounded
}

export type LocationFailure = 'denied' | 'unavailable'

export function requestWeatherLocation(geolocation: Geolocation | undefined): Promise<WeatherLocation> {
  if (!geolocation) return Promise.reject<WeatherLocation>('unavailable' satisfies LocationFailure)
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => reject(error.code === 1 ? 'denied' : 'unavailable' satisfies LocationFailure),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: weatherCacheTtlMs },
    )
  })
}

function freshEnough(session: WeatherSession, now: number, maxAge: number): boolean {
  return !!session.weather && session.fetchedAt !== null && now >= session.fetchedAt &&
    now - session.fetchedAt < maxAge &&
    localDateKey(new Date(now)) === localDateKey(new Date(session.fetchedAt))
}

export function cachedWeather(storage: Storage, now = Date.now()): WeatherSummary | null {
  const session = readWeatherSession(storage)
  return session && freshEnough(session, now, staleLimitMs) ? session.weather : null
}

let inFlight: { key: string; promise: Promise<WeatherSummary | null> } | null = null

export async function loadWeather(
  storage: Storage,
  location: WeatherLocation,
  fetcher: WeatherFetcher = fetch,
  now = Date.now(),
): Promise<WeatherSummary | null> {
  if (!isWeatherLocation(location)) return null
  const session = readWeatherSession(storage)
  const matching = session?.location.latitude === location.latitude &&
    session.location.longitude === location.longitude ? session : null
  if (matching && freshEnough(matching, now, weatherCacheTtlMs)) return matching.weather
  const fallback = matching && freshEnough(matching, now, staleLimitMs) ? matching.weather : null
  if (matching?.failedAt !== null && matching?.failedAt !== undefined &&
      now >= matching.failedAt && now - matching.failedAt < failureRetryMs) return fallback
  const key = `${location.latitude},${location.longitude}`
  if (inFlight?.key === key) return inFlight.promise

  const promise = (async () => {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(location.latitude))
    url.searchParams.set('longitude', String(location.longitude))
    url.searchParams.set('current', 'temperature_2m,weather_code')
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max')
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('temperature_unit', 'celsius')
    url.searchParams.set('forecast_days', '1')
    try {
      const response = await fetcher(url.toString(), {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('Weather provider unavailable.')
      const weather = normalizeOpenMeteoResponse(await response.json())
      if (!weather) throw new Error('Weather provider response was invalid.')
      writeWeatherSession(storage, { location, weather, fetchedAt: now, failedAt: null })
      return weather
    } catch {
      writeWeatherSession(storage, {
        location, weather: fallback, fetchedAt: fallback ? matching?.fetchedAt ?? null : null, failedAt: now,
      })
      return fallback
    }
  })()
  inFlight = { key, promise }
  try { return await promise } finally { if (inFlight?.promise === promise) inFlight = null }
}
