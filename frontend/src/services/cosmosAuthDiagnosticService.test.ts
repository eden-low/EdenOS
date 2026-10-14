import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getIdToken, auth } = vi.hoisted(() => ({
  getIdToken: vi.fn(async (_forceRefresh?: boolean) => 'diagnostic-token'),
  auth: { currentUser: null as null | { getIdToken: (forceRefresh?: boolean) => Promise<string> } },
}))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: { status: 'ready', services: { auth } } }))
import {
  checkCosmosAuthorization,
  CosmosAuthDiagnosticError,
  type CosmosAuthDiagnosticResult,
} from './cosmosAuthDiagnosticService'

const result: CosmosAuthDiagnosticResult = {
  tokenVerified: true,
  uidMatchesRuntimeAllowlist: true,
  signInProviderCategory: 'anonymous',
  googleIdentityLinked: true,
  adminGoogleProviderLinked: true,
  runtimeAllowlistConfigured: true,
  stagingContextVerified: true,
}

beforeEach(() => {
  auth.currentUser = { getIdToken }
  getIdToken.mockClear()
  vi.restoreAllMocks()
})

describe('Cosmos authorization diagnostic browser boundary', () => {
  it('uses a fresh token for one explicit no-store diagnostic request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }))
    await expect(checkCosmosAuthorization()).resolves.toEqual(result)
    expect(getIdToken).toHaveBeenCalledExactlyOnceWith(true)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/.netlify/functions/cosmos-auth-diagnostic', expect.objectContaining({
      method: 'POST', body: '{}', cache: 'no-store', headers: {
        Authorization: 'Bearer diagnostic-token', 'Content-Type': 'application/json',
      },
    }))
  })

  it('does not send without Firebase authentication', async () => {
    auth.currentUser = null
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(checkCosmosAuthorization()).rejects.toEqual(new CosmosAuthDiagnosticError('auth'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed output and maps safe server failures', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...result, uid: 'must-not-be-accepted' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'not-found' }), { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'diagnostic-unavailable' }), { status: 503 }))
    await expect(checkCosmosAuthorization()).rejects.toEqual(new CosmosAuthDiagnosticError('invalid-response'))
    await expect(checkCosmosAuthorization()).rejects.toEqual(new CosmosAuthDiagnosticError('not-staging'))
    await expect(checkCosmosAuthorization()).rejects.toEqual(new CosmosAuthDiagnosticError('unavailable'))
  })
})
