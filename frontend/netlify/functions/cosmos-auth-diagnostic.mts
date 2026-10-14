import { createCosmosAuthDiagnosticHandler, type NetlifyDeployIdentity } from '../../server/cosmosAuthDiagnosticHandler'
import { createCosmosAuthDiagnosticRuntime } from '../../server/cosmosAuthDiagnosticRuntime'

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
