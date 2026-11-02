// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cosmosModel, isAuthorizedCosmosIdentity } from './cosmosReadingRuntime'

describe('Cosmos reading runtime policy', () => {
  const allowlist = new Set(['approved-google-uid'])

  it.each([
    ['Owner Google UID', 'approved-google-uid', 'google.com', true],
    ['Other Google UID', 'different-valid-uid', 'google.com', false],
    ['Guest UID', 'approved-google-uid', 'anonymous', false],
  ] as const)('applies the Ask Cosmos policy for %s', (_label, uid, signInProvider, expected) => {
    expect(isAuthorizedCosmosIdentity({ uid, firebase: { sign_in_provider: signInProvider } }, allowlist)).toBe(expected)
  })

  it('uses the cost-efficient pinned default and rejects invalid model configuration', () => {
    expect(cosmosModel({})).toBe('gemini-3.1-flash-lite')
    expect(cosmosModel({ COSMOS_GEMINI_MODEL: 'gemini-3.1-flash-lite' })).toBe('gemini-3.1-flash-lite')
    expect(cosmosModel({ COSMOS_GEMINI_MODEL: '../secret' })).toBeNull()
  })
})
