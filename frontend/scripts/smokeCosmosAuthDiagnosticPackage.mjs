import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const frontendRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const functionsDirectory = resolve(frontendRoot, '.netlify/functions')
const manifest = JSON.parse(readFileSync(join(functionsDirectory, 'manifest.json'), 'utf8'))
const diagnostic = manifest.functions?.find((entry) => entry.name === 'cosmos-auth-diagnostic')

if (!diagnostic) throw new Error('Packaged cosmos-auth-diagnostic Function was not found')
if (diagnostic.bundler !== 'none' || diagnostic.buildData?.runtimeAPIVersion !== 2 || diagnostic.runtimeVersion !== 'nodejs24.x') {
  throw new Error(
    `Unexpected diagnostic packaging: bundler=${diagnostic.bundler}, api=${diagnostic.buildData?.runtimeAPIVersion}, runtime=${diagnostic.runtimeVersion}`,
  )
}

const archive = join(functionsDirectory, 'cosmos-auth-diagnostic.zip')
const extractionDirectory = mkdtempSync(join(tmpdir(), 'eden-cosmos-auth-package-'))

try {
  execFileSync('tar', ['-xf', archive, '-C', extractionDirectory], { stdio: 'pipe' })
  const modulePath = join(extractionDirectory, 'cosmos-auth-diagnostic.mjs')
  const smokeProgram = [
    `const moduleUrl = ${JSON.stringify(pathToFileURL(modulePath).href)};`,
    "const loaded = await import(moduleUrl);",
    "if (typeof loaded.default !== 'function') throw new Error('Diagnostic default handler is missing');",
    "if (loaded.config?.nodeBundler !== 'none') throw new Error('Diagnostic no-bundle config is missing');",
    "const response = await loaded.default(new Request('https://synthetic.invalid/.netlify/functions/cosmos-auth-diagnostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), { deploy: { context: 'branch-deploy', id: 'synthetic-deploy' }, site: { id: 'synthetic-site' } });",
    "if (response.status !== 401) throw new Error(`Expected unauthenticated cold-start response 401, received ${response.status}`);",
  ].join('\n')
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '--input-type=module', '--eval', smokeProgram], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
        project_id: 'synthetic-project',
        client_email: 'synthetic@example.invalid',
        private_key: 'synthetic-not-a-real-key',
      }),
      COSMOS_AUTHORIZED_FIREBASE_UIDS: 'synthetic-authorized-uid',
    },
  })
  if (result.status !== 0) {
    throw new Error(`Packaged diagnostic cold start failed: ${result.stderr || result.stdout}`)
  }
  process.stdout.write('Packaged cosmos-auth-diagnostic cold start succeeded with CommonJS-to-ESM interop disabled.\n')
} finally {
  rmSync(extractionDirectory, { recursive: true, force: true })
}
