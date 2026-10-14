// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  createCosmosAuthDiagnosticHandler,
  type CosmosAuthDiagnosticDependencies,
  type CosmosAuthDiagnosticResult,
} from './cosmosAuthDiagnosticHandler'

const result: CosmosAuthDiagnosticResult = {
  tokenVerified: true,
  uidMatchesRuntimeAllowlist: true,
  signInProviderCategory: 'anonymous',
  googleIdentityLinked: true,
  adminGoogleProviderLinked: true,
  runtimeAllowlistConfigured: true,
  stagingContextVerified: true,
}

const deploy = { context: 'branch-deploy', deployId: 'deploy-id', siteId: 'site-id' }

function request(options: { method?: string; token?: string | null; contentType?: string; body?: string; length?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': options.contentType ?? 'application/json' }
  const token = options.token === undefined ? 'verified-token' : options.token
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.length) headers['Content-Length'] = options.length
  return new Request('https://example.test/.netlify/functions/cosmos-auth-diagnostic', {
    method: options.method ?? 'POST', headers,
    body: options.method === 'GET' ? undefined : options.body ?? '{}',
  })
}

function dependencies(): CosmosAuthDiagnosticDependencies {
  return {
    verifyStagingDeploy: vi.fn(async () => true),
    inspect: vi.fn(async () => ({ status: 'verified' as const, result })),
  }
}

describe('Cosmos authorization diagnostic endpoint', () => {
  it('returns only safe categorical results after token inspection', async () => {
    const deps = dependencies()
    const response = await createCosmosAuthDiagnosticHandler(deps)(request(), deploy)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual(result)
    expect(deps.inspect).toHaveBeenCalledExactlyOnceWith('verified-token')
  })

  it('fails closed outside the verified staging deploy before inspecting a token', async () => {
    const deps = dependencies()
    const response = await createCosmosAuthDiagnosticHandler(deps)(request(), { context: 'production' })
    expect(response.status).toBe(404)
    expect(deps.inspect).not.toHaveBeenCalled()
    expect(deps.verifyStagingDeploy).not.toHaveBeenCalled()
  })

  it('returns no diagnostic fields when verified Netlify metadata is not staging', async () => {
    const deps = dependencies()
    deps.verifyStagingDeploy = vi.fn(async () => false)
    const response = await createCosmosAuthDiagnosticHandler(deps)(request(), deploy)
    expect(response.status).toBe(404)
    expect(deps.inspect).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual({ code: 'not-found' })
  })

  it('rejects missing and invalid Firebase tokens', async () => {
    const deps = dependencies()
    const handler = createCosmosAuthDiagnosticHandler(deps)
    expect((await handler(request({ token: null }), deploy)).status).toBe(401)
    deps.inspect = vi.fn(async () => ({ status: 'invalid-token' as const }))
    expect((await handler(request(), deploy)).status).toBe(401)
  })

  it('rejects unsupported methods, content types, bodies, and oversized requests', async () => {
    const deps = dependencies()
    const handler = createCosmosAuthDiagnosticHandler(deps)
    expect((await handler(request({ method: 'GET' }), deploy)).status).toBe(405)
    expect((await handler(request({ contentType: 'text/plain' }), deploy)).status).toBe(415)
    expect((await handler(request({ body: '{"extra":true}' }), deploy)).status).toBe(400)
    expect((await handler(request({ length: '65' }), deploy)).status).toBe(413)
    expect(deps.inspect).not.toHaveBeenCalled()
  })

  it('returns no diagnostic fields when Admin lookup is unavailable and logs nothing', async () => {
    const spies = [vi.spyOn(console, 'log').mockImplementation(() => undefined), vi.spyOn(console, 'info').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined), vi.spyOn(console, 'error').mockImplementation(() => undefined)]
    const deps = dependencies()
    deps.inspect = vi.fn(async () => ({ status: 'unavailable' as const }))
    const response = await createCosmosAuthDiagnosticHandler(deps)(request(), deploy)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'diagnostic-unavailable' })
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })
})
