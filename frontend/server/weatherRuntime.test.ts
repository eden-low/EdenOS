// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createWeatherRateLimiter, isAuthorizedWeatherIdentity, readWeatherServiceAccount } from './weatherRuntime'

describe('Weather runtime security', () => {
  it('accepts both Google and anonymous Firebase identities but no missing UID', () => {
    expect(isAuthorizedWeatherIdentity({ uid: 'google-uid' })).toBe(true)
    expect(isAuthorizedWeatherIdentity({ uid: 'anonymous-uid' })).toBe(true)
    expect(isAuthorizedWeatherIdentity({})).toBe(false)
  })

  it('requires a complete server-only Firebase service account', () => {
    expect(readWeatherServiceAccount({})).toBeNull()
    expect(readWeatherServiceAccount({ EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON: '{bad' })).toBeNull()
    expect(readWeatherServiceAccount({ EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      project_id: 'project', client_email: 'service@example.test', private_key: 'private',
    }) })).toMatchObject({ project_id: 'project' })
  })

  it('limits bursts per UID without sharing one user quota with another', () => {
    let now = 1_000
    const allow = createWeatherRateLimiter(2, 60_000, () => now)
    expect(allow('user-a')).toBe(true)
    expect(allow('user-a')).toBe(true)
    expect(allow('user-a')).toBe(false)
    expect(allow('user-b')).toBe(true)
    now += 60_001
    expect(allow('user-a')).toBe(true)
  })
})
