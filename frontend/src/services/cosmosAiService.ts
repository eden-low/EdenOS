import { firebaseInitialization } from '../lib/firebase'
import type { CosmosAiRequest, CosmosAiResponse } from '../cosmos/cosmosAiTypes'
import { validateCosmosAiResponse } from '../cosmos/cosmosAiValidation'
import { cosmosStagingDiagnostics } from '../cosmos/cosmosDiagnosticsConfig'

export type CosmosAiErrorCode =
  | 'auth' | 'token-refresh' | 'forbidden' | 'invalid' | 'too-large' | 'not-configured'
  | 'gemini-request-prerequisite' | 'gemini-authentication' | 'gemini-billing'
  | 'gemini-permission' | 'gemini-model-unavailable'
  | 'quota' | 'timeout' | 'malformed-response' | 'provider' | 'network'

export class CosmosAiError extends Error {
  readonly code: CosmosAiErrorCode
  readonly diagnosticId?: string

  constructor(code: CosmosAiErrorCode, diagnosticId?: string) {
    super(code)
    this.code = code
    this.diagnosticId = diagnosticId
  }
}

const serverCodes = new Set<CosmosAiErrorCode>([
  'auth', 'forbidden', 'invalid', 'too-large', 'not-configured',
  'gemini-request-prerequisite', 'gemini-authentication', 'gemini-billing', 'gemini-permission', 'gemini-model-unavailable',
  'quota', 'timeout', 'malformed-response', 'provider',
])

function safeDiagnosticId(value: unknown): string | undefined {
  return cosmosStagingDiagnostics && typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined
}

export async function requestCosmosInterpretation(request: CosmosAiRequest, signal?: AbortSignal): Promise<CosmosAiResponse> {
  if (firebaseInitialization.status !== 'ready' || !firebaseInitialization.services.auth.currentUser) throw new CosmosAiError('auth')
  // A Google link can preserve the Firebase user while changing the provider claim.
  // Force a fresh token for this owner-only endpoint so the server never sees a stale anonymous claim.
  // Local failures have no server invocation/log; mark their ID as client-only.
  const clientId = cosmosStagingDiagnostics ? `client-${crypto.randomUUID()}` : undefined
  let token: string
  try { token = await firebaseInitialization.services.auth.currentUser.getIdToken(true) } catch {
    throw new CosmosAiError('token-refresh', clientId)
  }
  if (signal?.aborted) throw new CosmosAiError('network', clientId)
  let response: Response
  try {
    response = await fetch('/.netlify/functions/cosmos-reading', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new CosmosAiError('network', clientId)
  }
  const value: unknown = await response.json().catch(() => null)
  const diagnosticId = safeDiagnosticId(response.headers.get('X-Cosmos-Diagnostic-Id')) ??
    safeDiagnosticId(value && typeof value === 'object' && 'diagnosticId' in value ? value.diagnosticId : null)
  if (!response.ok) {
    const code = value && typeof value === 'object' && 'code' in value ? value.code : null
    throw new CosmosAiError(typeof code === 'string' && serverCodes.has(code as CosmosAiErrorCode)
      ? code as CosmosAiErrorCode : 'provider', diagnosticId ?? clientId)
  }
  const validated = validateCosmosAiResponse(value)
  if (!validated) throw new CosmosAiError('malformed-response', diagnosticId ?? clientId)
  return validated
}
