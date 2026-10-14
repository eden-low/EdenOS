import type { DecodedIdToken } from 'firebase-admin/auth'
import {
  cosmosAuthorizedUids,
  getCosmosAdminAuth,
  readCosmosServiceAccount,
} from './cosmosReadingRuntime'
import type {
  CosmosAuthDiagnosticDependencies,
  CosmosAuthDiagnosticResult,
  NetlifyDeployIdentity,
} from './cosmosAuthDiagnosticHandler'

export type SignInProviderCategory = CosmosAuthDiagnosticResult['signInProviderCategory']

export function signInProviderCategory(provider: unknown): SignInProviderCategory {
  if (provider === 'google.com') return 'google'
  if (provider === 'anonymous') return 'anonymous'
  if (typeof provider === 'string' && provider.length > 0) return 'other'
  return 'missing'
}

export function tokenHasGoogleIdentity(decoded: Pick<DecodedIdToken, 'firebase'>): boolean {
  const identities = decoded.firebase?.identities
  const googleIdentity = identities && typeof identities === 'object'
    ? (identities as Record<string, unknown>)['google.com'] : undefined
  return Array.isArray(googleIdentity) && googleIdentity.length > 0
}

export function buildCosmosAuthDiagnosticResult(
  decoded: Pick<DecodedIdToken, 'uid' | 'firebase'>,
  allowlist: ReadonlySet<string>,
): CosmosAuthDiagnosticResult {
  return {
    tokenVerified: true,
    uidMatchesRuntimeAllowlist: allowlist.has(decoded.uid),
    signInProviderCategory: signInProviderCategory(decoded.firebase?.sign_in_provider),
    googleIdentityLinked: tokenHasGoogleIdentity(decoded),
    adminGoogleProviderLinked: 'unavailable',
    runtimeAllowlistConfigured: allowlist.size > 0,
    stagingContextVerified: true,
  }
}

interface DeployRecord { id?: unknown; branch?: unknown; context?: unknown; site_id?: unknown }

export async function verifyStagingDeploy(identity: NetlifyDeployIdentity, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (identity.context !== 'branch-deploy' || !identity.deployId || !identity.siteId) return false
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const response = await fetcher(
      `https://api.netlify.com/api/v1/sites/${encodeURIComponent(identity.siteId)}/deploys/${encodeURIComponent(identity.deployId)}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    )
    if (!response.ok) return false
    const value: unknown = await response.json()
    if (!value || typeof value !== 'object') return false
    const deploy = value as DeployRecord
    return deploy.id === identity.deployId && deploy.site_id === identity.siteId &&
      deploy.context === 'branch-deploy' && deploy.branch === 'staging'
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export function createCosmosAuthDiagnosticRuntime(
  env: NodeJS.ProcessEnv = process.env,
  adminAuthFactory: typeof getCosmosAdminAuth = getCosmosAdminAuth,
): CosmosAuthDiagnosticDependencies {
  const serviceAccount = readCosmosServiceAccount(env)
  const allowlist = cosmosAuthorizedUids(env)
  return {
    verifyStagingDeploy,
    async inspect(token) {
      if (!serviceAccount) return { status: 'unavailable' }
      const adminAuth = adminAuthFactory(serviceAccount)
      let decoded: DecodedIdToken
      try {
        decoded = await adminAuth.verifyIdToken(token)
      } catch {
        return { status: 'invalid-token' }
      }
      return {
        status: 'verified',
        result: buildCosmosAuthDiagnosticResult(decoded, allowlist),
      }
    },
  }
}
