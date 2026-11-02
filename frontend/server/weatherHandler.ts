import { OpenWeatherProviderError, type OpenWeatherSummary } from './openWeatherProvider'

const MAX_BODY_BYTES = 1024
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export interface WeatherDependencies {
  verifyToken: (token: string) => Promise<string | null>
  isConfigured: () => boolean
  allowRequest: (uid: string) => boolean
  current: (latitude: number, longitude: number) => Promise<OpenWeatherSummary>
}

function json(status: number, value: OpenWeatherSummary | { code: string }): Response {
  return new Response(JSON.stringify(value), { status, headers: responseHeaders })
}

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
}

function providerFailure(error: unknown): { status: number; code: string } {
  if (!(error instanceof OpenWeatherProviderError)) return { status: 503, code: 'provider' }
  if (error.code === 'quota') return { status: 429, code: 'quota' }
  if (error.code === 'timeout') return { status: 504, code: 'timeout' }
  if (error.code === 'authentication') return { status: 502, code: 'provider-auth' }
  if (error.code === 'malformed') return { status: 502, code: 'malformed-response' }
  return { status: 503, code: 'provider' }
}

export function createWeatherHandler(dependencies: WeatherDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { code: 'method' })
    const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
    if (!match) return json(401, { code: 'auth' })
    let uid: string | null
    try { uid = await dependencies.verifyToken(match[1]) } catch { return json(401, { code: 'auth' }) }
    if (!uid) return json(401, { code: 'auth' })
    if (!dependencies.allowRequest(uid)) return json(429, { code: 'rate-limit' })
    if (!dependencies.isConfigured()) return json(503, { code: 'not-configured' })
    if (request.headers.get('Content-Type')?.toLowerCase().split(';', 1)[0].trim() !== 'application/json') {
      return json(415, { code: 'unsupported' })
    }
    const contentLength = Number(request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    let text: string
    try { text = await request.text() } catch { return json(400, { code: 'invalid' }) }
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    let body: unknown
    try { body = JSON.parse(text) as unknown } catch { return json(400, { code: 'invalid' }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { code: 'invalid' })
    const input = body as Record<string, unknown>
    if (Object.keys(input).some((key) => key !== 'latitude' && key !== 'longitude') ||
        !validCoordinate(input.latitude, -90, 90) || !validCoordinate(input.longitude, -180, 180)) {
      return json(400, { code: 'invalid' })
    }
    try {
      return json(200, await dependencies.current(input.latitude, input.longitude))
    } catch (error) {
      const failure = providerFailure(error)
      return json(failure.status, { code: failure.code })
    }
  }
}
