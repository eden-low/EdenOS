// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenWeatherProviderError, type OpenWeatherSummary } from './openWeatherProvider'
import { createWeatherHandler, type WeatherDependencies } from './weatherHandler'

const weather: OpenWeatherSummary = {
  temperatureC: 30, condition: { label: 'Clear', kind: 'clear' }, highC: 31, lowC: 29,
  observedAt: '2026-11-02T12:00:00.000Z', provider: 'openweather',
}
const dependencies: WeatherDependencies = {
  verifyToken: vi.fn(async (token) => token === 'valid' ? 'firebase-uid' : null),
  isConfigured: vi.fn(() => true),
  allowRequest: vi.fn(() => true),
  current: vi.fn(async () => weather),
}

function request(body: unknown = { latitude: 3.14, longitude: 101.69 }, token: string | null = 'valid') {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return new Request('https://example.test/.netlify/functions/weather', {
    method: 'POST', headers, body: JSON.stringify(body),
  })
}

describe('Weather handler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows a verified Firebase identity and returns no-store JSON', async () => {
    const response = await createWeatherHandler(dependencies)(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(weather)
    expect(dependencies.current).toHaveBeenCalledWith(3.14, 101.69)
  })

  it('rejects missing and invalid Firebase credentials before provider access', async () => {
    const handler = createWeatherHandler(dependencies)
    expect((await handler(request(undefined, null))).status).toBe(401)
    expect((await handler(request(undefined, 'invalid'))).status).toBe(401)
    expect(dependencies.current).not.toHaveBeenCalled()
  })

  it.each([
    [{ latitude: 91, longitude: 0 }],
    [{ latitude: 0, longitude: -181 }],
    [{ latitude: '3.14', longitude: 101.69 }],
    [{ latitude: 3.14, longitude: 101.69, key: 'not-allowed' }],
  ])('rejects invalid or extra parameters', async (body) => {
    expect((await createWeatherHandler(dependencies)(request(body))).status).toBe(400)
  })

  it('fails closed when the key is missing and enforces the UID limiter', async () => {
    vi.mocked(dependencies.isConfigured).mockReturnValueOnce(false)
    expect((await createWeatherHandler(dependencies)(request())).status).toBe(503)
    vi.mocked(dependencies.allowRequest).mockReturnValueOnce(false)
    expect((await createWeatherHandler(dependencies)(request())).status).toBe(429)
  })

  it.each([
    ['authentication', 502], ['quota', 429], ['provider', 503], ['timeout', 504], ['malformed', 502],
  ] as const)('maps the safe upstream %s failure', async (code, status) => {
    vi.mocked(dependencies.current).mockRejectedValueOnce(new OpenWeatherProviderError(code))
    const response = await createWeatherHandler(dependencies)(request())
    expect(response.status).toBe(status)
    expect(JSON.stringify(await response.json())).not.toContain('test-only-key')
  })
})
