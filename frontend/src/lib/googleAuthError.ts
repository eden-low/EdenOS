export type GoogleAuthErrorKind =
  | 'cancelled'
  | 'account-conflict'
  | 'popup-blocked'
  | 'network'
  | 'unavailable'
  | 'unknown'

export function classifyGoogleAuthError(error: unknown): GoogleAuthErrorKind {
  if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown'
  const code = error.code
  if (typeof code !== 'string') return 'unknown'

  switch (code.toLowerCase().split('/').at(-1)) {
    case 'popup-closed-by-user':
    case 'cancelled-popup-request':
      return 'cancelled'
    case 'credential-already-in-use':
    case 'account-exists-with-different-credential':
    case 'email-already-in-use':
      return 'account-conflict'
    case 'popup-blocked':
      return 'popup-blocked'
    case 'network-request-failed':
    case 'unavailable':
      return 'network'
    case 'operation-not-allowed':
    case 'unauthorized-domain':
    case 'operation-not-supported-in-this-environment':
      return 'unavailable'
    default:
      return 'unknown'
  }
}

export function googleAuthErrorMessage(error: unknown, action: 'link' | 'sign-in'): string {
  switch (classifyGoogleAuthError(error)) {
    case 'account-conflict':
      return action === 'link'
        ? 'This Google account is already connected to another EdenOS account. Your guest records are unchanged.'
        : 'This Google account cannot be used for this EdenOS sign-in.'
    case 'popup-blocked':
      return 'The Google sign-in window could not open. Allow popups and try again.'
    case 'network':
      return 'The connection was interrupted. Try Google again when you are online.'
    case 'unavailable':
      return 'Google sign-in is unavailable here right now. Try again later.'
    case 'cancelled':
      return ''
    default:
      return action === 'link'
        ? 'Could not connect Google. Your guest records are unchanged; try again.'
        : 'Could not sign in with Google. Try again.'
  }
}
