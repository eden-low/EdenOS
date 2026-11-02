import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ currentUser: { getIdToken: vi.fn(async () => 'firebase-token') } }))
vi.mock('../lib/firebase', () => ({
  firebaseInitialization: { status: 'ready', services: { auth } },
}))

import { requestOpenWeather } from './openWeatherService'

const weather = {
  temperatureC: 30, condition: { label: 'Clear', kind: 'clear' }, highC: 31, lowC: 29,
  observedAt: '2026-11-02T12:00:00.000Z', provider: 'openweather',
}

describe('OpenWeather client', () => {
  beforeEach(() => {
    auth.currentUser.getIdToken.mockClear()
    vi.unstubAllGlobals()
  })

  it('calls only the authenticated same-origin Netlify Function', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => weather }))
    vi.stubGlobal('fetch', fetcher)
    await expect(requestOpenWeather({ latitude: 3.14, longitude: 101.69 })).resolves.toEqual(weather)
    expect(fetcher).toHaveBeenCalledWith('/.netlify/functions/weather', expect.objectContaining({
      method: 'POST', cache: 'no-store',
      headers: { Authorization: 'Bearer firebase-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: 3.14, longitude: 101.69 }),
    }))
    expect(auth.currentUser.getIdToken).toHaveBeenCalledOnce()
  })

  it.each([401, 429, 500, 503, 504])('rejects HTTP %i so the weather service can fall back', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status, json: async () => ({ code: 'unavailable' }) })))
    await expect(requestOpenWeather({ latitude: 3.14, longitude: 101.69 })).rejects.toThrow('did not return usable weather')
  })

  it('rejects an empty or malformed successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })))
    await expect(requestOpenWeather({ latitude: 3.14, longitude: 101.69 })).rejects.toThrow('did not return usable weather')
  })
})
