import { createCosmosAuthDiagnosticHandler, type NetlifyDeployIdentity } from './cosmosAuthDiagnosticHandler'
import { createCosmosAuthDiagnosticRuntime } from './cosmosAuthDiagnosticRuntime'

interface NetlifyContext {
  deploy?: { context?: string; id?: string }
  site?: { id?: string }
}

const handler = createCosmosAuthDiagnosticHandler(createCosmosAuthDiagnosticRuntime())

export default async (request: Request, context: NetlifyContext): Promise<Response> => {
  const deploy: NetlifyDeployIdentity = {
    context: context.deploy?.context,
    deployId: context.deploy?.id,
    siteId: context.site?.id,
  }
  return handler(request, deploy)
}

// Modern Functions expose trusted deploy metadata, but their default NFT packaging
// leaves jwks-rsa's CommonJS require of ESM-only jose unresolved. This entrypoint is
// prebundled by the repository build and must not be dependency-traced a second time.
export const config = { nodeBundler: 'none' }
