export type OpenWeatherKind =
  | 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle'
  | 'rain' | 'snow' | 'showers' | 'thunderstorm' | 'unknown'

export interface OpenWeatherSummary {
  temperatureC: number
  condition: { label: string; kind: OpenWeatherKind }
  highC: number
  lowC: number
  observedAt: string
  provider: 'openweather'
}

export class OpenWeatherProviderError extends Error {
  constructor(readonly code: 'authentication' | 'quota' | 'timeout' | 'provider' | 'malformed') {
    super(code)
  }
}

type WeatherFetcher = (input: string, init?: RequestInit) => Promise<Response>

export function openWeatherCondition(id: number): OpenWeatherSummary['condition'] {
  if (id >= 200 && id < 300) return { label: 'Thunderstorm', kind: 'thunderstorm' }
  if (id >= 300 && id < 400) return { label: 'Drizzle', kind: 'drizzle' }
  if (id >= 500 && id < 600) return id >= 520
    ? { label: 'Showers', kind: 'showers' }
    : { label: 'Rain', kind: 'rain' }
  if (id >= 600 && id < 700) return { label: 'Snow', kind: 'snow' }
  if (id >= 700 && id < 800) return { label: 'Fog or haze', kind: 'fog' }
  if (id === 800) return { label: 'Clear', kind: 'clear' }
  if (id === 801 || id === 802) return { label: 'Partly cloudy', kind: 'partly-cloudy' }
  if (id === 803 || id === 804) return { label: 'Overcast', kind: 'cloudy' }
  return { label: 'Conditions unavailable', kind: 'unknown' }
}

export function normalizeOpenWeatherResponse(value: unknown): OpenWeatherSummary | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (!data.main || typeof data.main !== 'object' || !Array.isArray(data.weather) || !data.weather[0] ||
      typeof data.weather[0] !== 'object') return null
  const main = data.main as Record<string, unknown>
  const conditionId = (data.weather[0] as Record<string, unknown>).id
  const temperature = main.temp
  const low = typeof main.temp_min === 'number' ? main.temp_min : temperature
  const high = typeof main.temp_max === 'number' ? main.temp_max : temperature
  if (typeof temperature !== 'number' || !Number.isFinite(temperature) ||
      typeof low !== 'number' || !Number.isFinite(low) ||
      typeof high !== 'number' || !Number.isFinite(high) || high < low ||
      typeof conditionId !== 'number' || !Number.isInteger(conditionId) ||
      typeof data.dt !== 'number' || !Number.isSafeInteger(data.dt) || data.dt <= 0) return null
  return {
    temperatureC: temperature,
    condition: openWeatherCondition(conditionId),
    highC: high,
    lowC: low,
    observedAt: new Date(data.dt * 1000).toISOString(),
    provider: 'openweather',
  }
}

export function createOpenWeatherProvider(apiKey: string, fetcher: WeatherFetcher = fetch, timeoutMs = 4_000) {
  return {
    async current(latitude: number, longitude: number): Promise<OpenWeatherSummary> {
      const url = new URL('https://api.openweathermap.org/data/2.5/weather')
      url.searchParams.set('lat', String(latitude))
      url.searchParams.set('lon', String(longitude))
      url.searchParams.set('units', 'metric')
      url.searchParams.set('appid', apiKey)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetcher(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        })
        if (response.status === 401 || response.status === 403) throw new OpenWeatherProviderError('authentication')
        if (response.status === 429) throw new OpenWeatherProviderError('quota')
        if (!response.ok) throw new OpenWeatherProviderError('provider')
        const weather = normalizeOpenWeatherResponse(await response.json())
        if (!weather) throw new OpenWeatherProviderError('malformed')
        return weather
      } catch (error) {
        if (error instanceof OpenWeatherProviderError) throw error
        if (controller.signal.aborted) throw new OpenWeatherProviderError('timeout')
        throw new OpenWeatherProviderError('provider')
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
