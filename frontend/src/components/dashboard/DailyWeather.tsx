import {
  Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cachedWeather, cancelWeatherRequests, loadWeather, readWeatherSession, rememberWeatherLocation,
  requestWeatherLocation, weatherAttributions, type WeatherKind, type WeatherSummary,
} from '../../services/weather'
import { requestOpenWeather } from '../../services/openWeatherService'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'

const weatherIcons: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  showers: CloudRain,
  thunderstorm: CloudLightning,
  unknown: CloudSun,
}

type WeatherState =
  | { status: 'setup' | 'locating' | 'loading' | 'denied' | 'unavailable'; weather: null }
  | { status: 'ready'; weather: WeatherSummary }

function initialWeatherState(uid: string): WeatherState {
  const weather = cachedWeather(sessionStorage, uid)
  if (weather) return { status: 'ready', weather }
  return { status: readWeatherSession(sessionStorage, uid) ? 'loading' : 'setup', weather: null }
}

export function DailyWeather() {
  const { uid } = useFirebaseAuth()
  return <DailyWeatherForUser key={uid} uid={uid} />
}

function DailyWeatherForUser({ uid }: { uid: string }) {
  const [state, setState] = useState<WeatherState>(() => initialWeatherState(uid))
  const requestRef = useRef<AbortController | null>(null)

  const startRequest = useCallback((): AbortController => {
    requestRef.current?.abort()
    cancelWeatherRequests(uid)
    const controller = new AbortController()
    requestRef.current = controller
    return controller
  }, [uid])

  useEffect(() => {
    const saved = readWeatherSession(sessionStorage, uid)
    if (!saved) return () => cancelWeatherRequests(uid)
    const controller = startRequest()
    void loadWeather(sessionStorage, uid, saved.location, fetch, Date.now(), controller.signal, requestOpenWeather).then((weather) => {
      if (!controller.signal.aborted) setState(weather ? { status: 'ready', weather } : { status: 'unavailable', weather: null })
    })
    return () => {
      controller.abort()
      cancelWeatherRequests(uid)
    }
  }, [startRequest, uid])

  async function enableWeather() {
    const controller = startRequest()
    setState({ status: 'locating', weather: null })
    try {
      const location = await requestWeatherLocation(navigator.geolocation)
      if (controller.signal.aborted) return
      const rounded = rememberWeatherLocation(sessionStorage, uid, location)
      setState({ status: 'loading', weather: null })
      const weather = await loadWeather(sessionStorage, uid, rounded, fetch, Date.now(), controller.signal, requestOpenWeather)
      if (!controller.signal.aborted) {
        setState(weather ? { status: 'ready', weather } : { status: 'unavailable', weather: null })
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setState({ status: cause === 'denied' ? 'denied' : 'unavailable', weather: null })
      }
    }
  }

  const weather = state.weather
  const attribution = weather ? weatherAttributions[weather.provider] : null
  const Icon = weather ? weatherIcons[weather.condition.kind] : CloudSun
  return (
    <div role="region" aria-label="Weather" className="flex min-h-24 min-w-0 items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2 sm:min-h-28 sm:border-b-0 sm:border-r sm:px-5 sm:py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-blue-wash)] text-[var(--accent-soft)]">
        <Icon aria-hidden="true" size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="section-label sr-only sm:not-sr-only">Weather</p>
        {weather ? (
          <>
            <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
              {Math.round(weather.temperatureC)}°C <span className="font-normal text-[var(--text-secondary)]">· {weather.condition.label}</span>
            </p>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              {weather.provider === 'openweather'
                ? `Current range ${Math.round(weather.lowC)}–${Math.round(weather.highC)}°C`
                : `H ${Math.round(weather.highC)}° · L ${Math.round(weather.lowC)}°`}
              {weather.precipitationProbability !== undefined && ` · Precipitation ${Math.round(weather.precipitationProbability)}%`}
            </p>
            <a
              className="inline-flex min-h-10 items-center text-[11px] leading-4 text-[var(--text-muted)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)]"
              href={attribution?.url}
              target="_blank"
              rel="noopener noreferrer"
            >{attribution?.label}</a>
          </>
        ) : state.status === 'setup' || state.status === 'denied' ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {state.status === 'denied' && <span className="text-xs text-[var(--text-secondary)]">Location access denied.</span>}
            <button
              type="button"
              className="min-h-10 rounded-md px-2 text-sm font-medium text-[var(--accent-soft)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)]"
              onClick={() => void enableWeather()}
            >{state.status === 'denied' ? 'Try again' : 'Enable weather'}</button>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {state.status === 'unavailable' ? 'Weather unavailable.' : 'Checking weather…'}
          </p>
        )}
      </div>
    </div>
  )
}
