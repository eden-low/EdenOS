import { describe, expect, it } from 'vitest'
import { classifyGoogleAuthError, googleAuthErrorMessage } from './googleAuthError'

describe('Google auth failures', () => {
  it.each([
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/cancelled-popup-request', 'cancelled'],
    ['auth/credential-already-in-use', 'account-conflict'],
    ['auth/account-exists-with-different-credential', 'account-conflict'],
    ['auth/popup-blocked', 'popup-blocked'],
    ['auth/network-request-failed', 'network'],
    ['auth/unauthorized-domain', 'unavailable'],
    ['auth/operation-not-allowed', 'unavailable'],
  ] as const)('classifies %s as %s', (code, kind) => {
    expect(classifyGoogleAuthError({ code })).toBe(kind)
  })

  it('keeps conflict, cancellation, popup, network, and unknown messaging distinct', () => {
    expect(googleAuthErrorMessage({ code: 'auth/credential-already-in-use' }, 'link'))
      .toContain('already connected to another EdenOS account')
    expect(googleAuthErrorMessage({ code: 'auth/popup-closed-by-user' }, 'link')).toBe('')
    expect(googleAuthErrorMessage({ code: 'auth/popup-blocked' }, 'sign-in')).toContain('Allow popups')
    expect(googleAuthErrorMessage({ code: 'auth/network-request-failed' }, 'link')).toContain('connection')
    expect(googleAuthErrorMessage(new Error('unexpected'), 'link')).toContain('guest records are unchanged')
  })
})
