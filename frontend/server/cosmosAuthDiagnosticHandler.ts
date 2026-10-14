const MAX_BODY_BYTES = 64
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
}

export type SignInProviderCategory = 'google' | 'anonymous' | 'other' | 'missing'

export interface CosmosAuthDiagnosticResult {
  tokenVerified: true
  uidMatchesRuntimeAllowlist: boolean
  signInProviderCategory: SignInProviderCategory
  googleIdentityLinked: boolean
  adminGoogleProviderLinked: boolean
  runtimeAllowlistConfigured: boolean
  stagingContextVerified: true
}

export interface NetlifyDeployIdentity {
  context?: string
  deployId?: string
  siteId?: string
}

type Inspection =
  | { status: 'verified'; result: CosmosAuthDiagnosticResult }
  | { status: 'invalid-token' | 'unavailable' }

export interface CosmosAuthDiagnosticDependencies {
  verifyStagingDeploy: (identity: NetlifyDeployIdentity) => Promise<boolean>
  inspect: (token: string) => Promise<Inspection>
}

function json(status: number, value: CosmosAuthDiagnosticResult | { code: string }): Response {
  return new Response(JSON.stringify(value), { status, headers: responseHeaders })
}

export function createCosmosAuthDiagnosticHandler(dependencies: CosmosAuthDiagnosticDependencies) {
  return async (request: Request, deploy: NetlifyDeployIdentity): Promise<Response> => {
    if (request.method !== 'POST') return json(405, { code: 'method' })
    if (deploy.context !== 'branch-deploy' || !deploy.deployId || !deploy.siteId) return json(404, { code: 'not-found' })
    const match = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)
    if (!match) return json(401, { code: 'auth' })
    if (request.headers.get('Content-Type')?.toLowerCase().split(';', 1)[0].trim() !== 'application/json') {
      return json(415, { code: 'unsupported' })
    }
    const contentLength = Number(request.headers.get('Content-Length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    let text: string
    try { text = await request.text() } catch { return json(400, { code: 'invalid' }) }
    if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json(413, { code: 'too-large' })
    try {
      const value: unknown = JSON.parse(text)
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 0) {
        return json(400, { code: 'invalid' })
      }
    } catch {
      return json(400, { code: 'invalid' })
    }
    const inspection = await dependencies.inspect(match[1])
    if (inspection.status !== 'verified') {
      return inspection.status === 'invalid-token'
        ? json(401, { code: 'auth' })
        : json(503, { code: 'diagnostic-unavailable' })
    }
    if (!await dependencies.verifyStagingDeploy(deploy)) return json(404, { code: 'not-found' })
    return json(200, inspection.result)
  }
}
