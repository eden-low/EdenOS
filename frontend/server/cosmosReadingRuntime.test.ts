// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cosmosModel, isAuthorizedCosmosIdentity } from './cosmosReadingRuntime'

describe('Cosmos reading runtime policy', () => {
  const allowlist = new Set(['approved-google-uid'])

  it('requires an exact allowlisted UID and rejects other valid users', () => {
    expect(isAuthorizedCosmosIdentity({ uid: 'approved-google-uid', firebase: { sign_in_provider: 'google.com' } }, allowlist)).toBe(true)
    expect(isAuthorizedCosmosIdentity({ uid: 'different-valid-uid', firebase: { sign_in_provider: 'google.com' } }, allowlist)).toBe(false)
  })

  it('rejects anonymous sessions even if an anonymous UID were accidentally allowlisted', () => {
    const accidental = new Set(['anonymous-uid'])
    expect(isAuthorizedCosmosIdentity({ uid: 'anonymous-uid', firebase: { sign_in_provider: 'anonymous' } }, accidental)).toBe(false)
  })

  it('uses the cost-efficient pinned default and rejects invalid model configuration', () => {
    expect(cosmosModel({})).toBe('gemini-2.5-flash')
    expect(cosmosModel({ COSMOS_GEMINI_MODEL: 'gemini-2.5-flash' })).toBe('gemini-2.5-flash')
    expect(cosmosModel({ COSMOS_GEMINI_MODEL: '../secret' })).toBeNull()
  })
})
