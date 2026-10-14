import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entryPoint = resolve(frontendRoot, 'server/cosmosAuthDiagnosticFunction.ts')
const outfile = resolve(frontendRoot, 'netlify/functions/cosmos-auth-diagnostic.mjs')

await mkdir(dirname(outfile), { recursive: true })
await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  legalComments: 'none',
  sourcemap: false,
  treeShaking: true,
  logLevel: 'info',
})
