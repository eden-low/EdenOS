// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  adminHasGoogleProvider,
  buildCosmosAuthDiagnosticResult,
  signInProviderCategory,
  tokenHasGoogleIdentity,
  verifyStagingDeploy,
} from './cosmosAuthDiagnosticRuntime'
import { cosmosAuthorizedUids } from './cosmosReadingRuntime'

describe('Cosmos authorization diagnostic facts', () => {
  it('categorizes Google, anonymous-origin, other, and missing providers', () => {
    expect(signInProviderCategory('google.com')).toBe('google')
    expect(signInProviderCategory('anonymous')).toBe('anonymous')
    expect(signInProviderCategory('password')).toBe('other')
    expect(signInProviderCategory(undefined)).toBe('missing')
  })

  it('distinguishes token identities from Admin-linked provider data', () => {
    expect(tokenHasGoogleIdentity({ firebase: { identities: { 'google.com': ['provider-subject'] }, sign_in_provider: 'anonymous' } } as never)).toBe(true)
    expect(tokenHasGoogleIdentity({ firebase: { identities: {}, sign_in_provider: 'anonymous' } } as never)).toBe(false)
    expect(adminHasGoogleProvider({ providerData: [{ providerId: 'google.com' }] } as never)).toBe(true)
    expect(adminHasGoogleProvider({ providerData: [] } as never)).toBe(false)
  })

  it('reports allowlisted Google and linked anonymous-origin accounts without authorizing either', () => {
    const allowlist = new Set(['approved-uid'])
    const google = buildCosmosAuthDiagnosticResult({
      uid: 'approved-uid', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['subject'] } },
    } as never, { providerData: [{ providerId: 'google.com' }] } as never, allowlist)
    expect(google).toMatchObject({ uidMatchesRuntimeAllowlist: true, signInProviderCategory: 'google',
      googleIdentityLinked: true, adminGoogleProviderLinked: true })

    const linkedAnonymousOrigin = buildCosmosAuthDiagnosticResult({
      uid: 'approved-uid', firebase: { sign_in_provider: 'anonymous', identities: { 'google.com': ['subject'] } },
    } as never, { providerData: [{ providerId: 'google.com' }] } as never, allowlist)
    expect(linkedAnonymousOrigin).toMatchObject({ uidMatchesRuntimeAllowlist: true, signInProviderCategory: 'anonymous',
      googleIdentityLinked: true, adminGoogleProviderLinked: true })
  })

  it('reports anonymous, non-allowlisted, incorrect, and missing runtime authorization state', () => {
    const anonymous = buildCosmosAuthDiagnosticResult({
      uid: 'anonymous-uid', firebase: { sign_in_provider: 'anonymous', identities: {} },
    } as never, { providerData: [] } as never, new Set(['anonymous-uid']))
    expect(anonymous).toMatchObject({ uidMatchesRuntimeAllowlist: true, signInProviderCategory: 'anonymous',
      googleIdentityLinked: false, adminGoogleProviderLinked: false })

    const nonAllowlisted = buildCosmosAuthDiagnosticResult({
      uid: 'different-uid', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['subject'] } },
    } as never, { providerData: [{ providerId: 'google.com' }] } as never, new Set(['approved-uid']))
    expect(nonAllowlisted.uidMatchesRuntimeAllowlist).toBe(false)
    expect(buildCosmosAuthDiagnosticResult({ uid: 'approved-uid', firebase: { sign_in_provider: 'google.com' } } as never,
      { providerData: [{ providerId: 'google.com' }] } as never, new Set(['wrong-runtime-uid'])).uidMatchesRuntimeAllowlist).toBe(false)
    expect(cosmosAuthorizedUids({}).size).toBe(0)
    expect(buildCosmosAuthDiagnosticResult({ uid: 'approved-uid', firebase: { sign_in_provider: 'google.com' } } as never,
      { providerData: [{ providerId: 'google.com' }] } as never, new Set()).runtimeAllowlistConfigured).toBe(false)
  })

  it('verifies the trusted deploy ID is the staging branch deploy', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: 'deploy-id', site_id: 'site-id', context: 'branch-deploy', branch: 'staging',
    }), { status: 200 })) as unknown as typeof fetch
    await expect(verifyStagingDeploy({ context: 'branch-deploy', deployId: 'deploy-id', siteId: 'site-id' }, fetcher)).resolves.toBe(true)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('fails closed for another branch, context, or unavailable deploy metadata', async () => {
    const otherBranch = vi.fn(async () => new Response(JSON.stringify({
      id: 'deploy-id', site_id: 'site-id', context: 'branch-deploy', branch: 'feature',
    }), { status: 200 })) as unknown as typeof fetch
    await expect(verifyStagingDeploy({ context: 'branch-deploy', deployId: 'deploy-id', siteId: 'site-id' }, otherBranch)).resolves.toBe(false)
    const unused = vi.fn() as unknown as typeof fetch
    await expect(verifyStagingDeploy({ context: 'production', deployId: 'deploy-id', siteId: 'site-id' }, unused)).resolves.toBe(false)
    expect(unused).not.toHaveBeenCalled()
    const unavailable = vi.fn(async () => { throw new Error('private network detail') }) as unknown as typeof fetch
    await expect(verifyStagingDeploy({ context: 'branch-deploy', deployId: 'deploy-id', siteId: 'site-id' }, unavailable)).resolves.toBe(false)
  })
})
