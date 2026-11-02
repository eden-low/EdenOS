import { firebaseInitialization } from '../lib/firebase'
import { isWeatherSummary, type WeatherLocation, type WeatherSummary } from './weather'

export async function requestOpenWeather(location: WeatherLocation, signal?: AbortSignal): Promise<WeatherSummary> {
  if (firebaseInitialization.status !== 'ready' || !firebaseInitialization.services.auth.currentUser) {
    throw new Error('Weather authentication is unavailable.')
  }
  const token = await firebaseInitialization.services.auth.currentUser.getIdToken()
  let response: Response
  try {
    response = await fetch('/.netlify/functions/weather', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('OpenWeather proxy is unavailable.')
  }
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok || !isWeatherSummary(value) || value.provider !== 'openweather') {
    throw new Error('OpenWeather proxy did not return usable weather.')
  }
  return value
}
