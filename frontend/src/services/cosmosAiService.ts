import { firebaseInitialization } from '../lib/firebase'
import type { CosmosAiRequest, CosmosAiResponse } from '../cosmos/cosmosAiTypes'
import { validateCosmosAiResponse } from '../cosmos/cosmosAiValidation'

export type CosmosAiErrorCode =
  | 'auth' | 'forbidden' | 'invalid' | 'too-large' | 'not-configured'
  | 'quota' | 'timeout' | 'malformed-response' | 'provider' | 'network'

export class CosmosAiError extends Error {
  readonly code: CosmosAiErrorCode

  constructor(code: CosmosAiErrorCode) {
    super(code)
    this.code = code
  }
}

const serverCodes = new Set<CosmosAiErrorCode>([
  'auth', 'forbidden', 'invalid', 'too-large', 'not-configured', 'quota', 'timeout', 'malformed-response', 'provider',
])

export async function requestCosmosInterpretation(request: CosmosAiRequest, signal?: AbortSignal): Promise<CosmosAiResponse> {
  if (firebaseInitialization.status !== 'ready' || !firebaseInitialization.services.auth.currentUser) throw new CosmosAiError('auth')
  const token = await firebaseInitialization.services.auth.currentUser.getIdToken()
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
    throw new CosmosAiError('network')
  }
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = value && typeof value === 'object' && 'code' in value ? value.code : null
    throw new CosmosAiError(typeof code === 'string' && serverCodes.has(code as CosmosAiErrorCode)
      ? code as CosmosAiErrorCode : 'provider')
  }
  const validated = validateCosmosAiResponse(value)
  if (!validated) throw new CosmosAiError('malformed-response')
  return validated
}
