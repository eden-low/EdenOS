import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin, type Rollup } from 'vite'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(scriptDirectory, '..')

function displayModule(id: string): string {
  const normalized = id.replaceAll('\\', '/')
  const nodeModules = normalized.lastIndexOf('/node_modules/')
  return nodeModules >= 0 ? normalized.slice(nodeModules + '/node_modules/'.length) : path.relative(frontendRoot, id).replaceAll('\\', '/')
}

function bundleAnalysisPlugin(): Plugin {
  return {
    name: 'edenos-bundle-analysis',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle)
        .filter((item): item is Rollup.OutputChunk => item.type === 'chunk')
        .sort((left, right) => right.code.length - left.code.length)

      console.log('\nEdenOS bundle analysis (rendered bytes before compression)')
      for (const chunk of chunks) {
        const modules = Object.entries(chunk.modules)
          .map(([id, details]) => ({ id: displayModule(id), bytes: details.renderedLength }))
          .sort((left, right) => right.bytes - left.bytes)
          .slice(0, 12)
        console.log(`\n${chunk.fileName}: ${chunk.code.length.toLocaleString()} bytes${chunk.isEntry ? ' [initial entry]' : ''}`)
        for (const module of modules) console.log(`  ${module.bytes.toLocaleString().padStart(10)}  ${module.id}`)
      }
    },
  }
}

await build({
  root: frontendRoot,
  configFile: path.join(frontendRoot, 'vite.config.ts'),
  build: { write: false },
  plugins: [bundleAnalysisPlugin()],
})
