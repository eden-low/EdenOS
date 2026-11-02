import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createOpenWeatherProvider } from './openWeatherProvider'
import type { WeatherDependencies } from './weatherHandler'

interface ServiceAccountConfig { project_id: string; client_email: string; private_key: string }

export function readWeatherServiceAccount(env: NodeJS.ProcessEnv = process.env): ServiceAccountConfig | null {
  const value = env.EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' ||
        !('project_id' in parsed) || typeof parsed.project_id !== 'string' || !parsed.project_id.trim() ||
        !('client_email' in parsed) || typeof parsed.client_email !== 'string' || !parsed.client_email.trim() ||
        !('private_key' in parsed) || typeof parsed.private_key !== 'string' || !parsed.private_key.trim()) return null
    return parsed as ServiceAccountConfig
  } catch { return null }
}

export function isAuthorizedWeatherIdentity(decoded: { uid?: unknown }): decoded is { uid: string } {
  return typeof decoded.uid === 'string' && decoded.uid.length > 0
}

export function createWeatherRateLimiter(maxRequests = 10, windowMs = 60_000, now = Date.now) {
  const requests = new Map<string, number[]>()
  return (uid: string): boolean => {
    const cutoff = now() - windowMs
    const recent = (requests.get(uid) ?? []).filter((timestamp) => timestamp > cutoff)
    if (recent.length >= maxRequests) {
      requests.set(uid, recent)
      return false
    }
    recent.push(now())
    requests.set(uid, recent)
    return true
  }
}

export function createWeatherRuntime(): WeatherDependencies {
  const serviceAccount = readWeatherServiceAccount()
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim()
  const provider = apiKey ? createOpenWeatherProvider(apiKey) : null
  const allowRequest = createWeatherRateLimiter()
  return {
    isConfigured: () => serviceAccount !== null && provider !== null,
    allowRequest,
    async verifyToken(token) {
      if (!serviceAccount) return null
      const app = getApps().find((item) => item.name === 'edenos-weather') ?? initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
      }, 'edenos-weather')
      const decoded = await getAuth(app).verifyIdToken(token)
      return isAuthorizedWeatherIdentity(decoded) ? decoded.uid : null
    },
    async current(latitude, longitude) {
      if (!provider) throw new Error('OpenWeather is not configured')
      return provider.current(latitude, longitude)
    },
  }
}
