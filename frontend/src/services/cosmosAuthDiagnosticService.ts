import { firebaseInitialization } from '../lib/firebase'

export type CosmosSignInProviderCategory = 'google' | 'anonymous' | 'other' | 'missing'
export type AdminGoogleProviderLinked = boolean | 'unavailable'

export interface CosmosAuthDiagnosticResult {
  tokenVerified: true
  uidMatchesRuntimeAllowlist: boolean
  signInProviderCategory: CosmosSignInProviderCategory
  googleIdentityLinked: boolean
  adminGoogleProviderLinked: AdminGoogleProviderLinked
  runtimeAllowlistConfigured: boolean
  stagingContextVerified: true
}

export type CosmosAuthDiagnosticErrorCode = 'auth' | 'not-staging' | 'unavailable' | 'invalid-response' | 'network'

export class CosmosAuthDiagnosticError extends Error {
  readonly code: CosmosAuthDiagnosticErrorCode

  constructor(code: CosmosAuthDiagnosticErrorCode) {
    super(code)
    this.code = code
  }
}

const providerCategories = new Set<CosmosSignInProviderCategory>(['google', 'anonymous', 'other', 'missing'])

export function validateCosmosAuthDiagnosticResult(value: unknown): CosmosAuthDiagnosticResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const result = value as Record<string, unknown>
  if (Object.keys(result).length !== 7 || result.tokenVerified !== true || result.stagingContextVerified !== true ||
      typeof result.uidMatchesRuntimeAllowlist !== 'boolean' || typeof result.googleIdentityLinked !== 'boolean' ||
      (typeof result.adminGoogleProviderLinked !== 'boolean' && result.adminGoogleProviderLinked !== 'unavailable') ||
      typeof result.runtimeAllowlistConfigured !== 'boolean' ||
      typeof result.signInProviderCategory !== 'string' ||
      !providerCategories.has(result.signInProviderCategory as CosmosSignInProviderCategory)) return null
  return result as unknown as CosmosAuthDiagnosticResult
}

export async function checkCosmosAuthorization(signal?: AbortSignal): Promise<CosmosAuthDiagnosticResult> {
  if (firebaseInitialization.status !== 'ready' || !firebaseInitialization.services.auth.currentUser) {
    throw new CosmosAuthDiagnosticError('auth')
  }
  const token = await firebaseInitialization.services.auth.currentUser.getIdToken(true)
  let response: Response
  try {
    response = await fetch('/.netlify/functions/cosmos-auth-diagnostic', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new CosmosAuthDiagnosticError('network')
  }
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) throw new CosmosAuthDiagnosticError('auth')
    if (response.status === 404) throw new CosmosAuthDiagnosticError('not-staging')
    throw new CosmosAuthDiagnosticError('unavailable')
  }
  const result = validateCosmosAuthDiagnosticResult(value)
  if (!result) throw new CosmosAuthDiagnosticError('invalid-response')
  return result
}
