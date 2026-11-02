import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function isStagingDiagnosticsBuild(env: NodeJS.ProcessEnv): boolean {
  return env.NETLIFY === 'true' && env.CONTEXT === 'branch-deploy' && env.BRANCH === 'staging'
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const enabled = isStagingDiagnosticsBuild(process.env)
  writeFileSync(new URL('../src/cosmos/cosmosDiagnosticsConfig.ts', import.meta.url),
    `// Rewritten by the build from Netlify's trusted build context; no secrets are embedded.\nexport const cosmosStagingDiagnostics: boolean = ${enabled}\n`)
}
