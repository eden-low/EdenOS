import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AnimeSyncMode, MacCmsVodItem, SyncFailure } from './types'
import { parseMacCmsEnvelope } from './macCmsProvider'

export interface RawRunManifest {
  runId: string
  mode: AnimeSyncMode
  startedAt: string
  providers: Record<string, { pages: number; itemCount: number; failures: number }>
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_')
}

export class AnimeRawCache {
  readonly root: string
  readonly runId: string

  constructor(root: string, runId: string) {
    this.root = root
    this.runId = runId
  }

  private runPath(...segments: string[]): string {
    return path.join(this.root, 'raw', safeSegment(this.runId), ...segments.map(safeSegment))
  }

  async writePage(provider: string, page: number, raw: unknown): Promise<void> {
    const directory = this.runPath(provider)
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, `page-${String(page).padStart(4, '0')}.json`), JSON.stringify(raw, null, 2), 'utf8')
  }

  async writeDetail(provider: string, providerItemId: string, raw: unknown): Promise<void> {
    const directory = this.runPath(provider, 'details')
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, `${safeSegment(providerItemId)}.json`), JSON.stringify(raw, null, 2), 'utf8')
  }

  async writeManifest(manifest: RawRunManifest): Promise<void> {
    const directory = this.runPath()
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  }

  async writeFailures(failures: SyncFailure[]): Promise<string> {
    const directory = path.join(this.root, 'failed')
    await mkdir(directory, { recursive: true })
    const target = path.join(directory, `${safeSegment(this.runId)}.json`)
    await writeFile(target, JSON.stringify({ runId: this.runId, failures }, null, 2), 'utf8')
    return target
  }
}

export async function readCachedDetails(runDirectory: string): Promise<Map<string, MacCmsVodItem[]>> {
  const result = new Map<string, MacCmsVodItem[]>()
  const entries = await readdir(runDirectory, { withFileTypes: true })
  for (const providerEntry of entries.filter((entry) => entry.isDirectory())) {
    const detailDirectory = path.join(runDirectory, providerEntry.name, 'details')
    let files: string[]
    try { files = await readdir(detailDirectory) } catch { continue }
    const items: MacCmsVodItem[] = []
    for (const file of files.filter((name) => name.endsWith('.json')).sort()) {
      const raw: unknown = JSON.parse(await readFile(path.join(detailDirectory, file), 'utf8'))
      items.push(...parseMacCmsEnvelope(raw).items)
    }
    result.set(providerEntry.name, items)
  }
  return result
}

export async function readFailureFile(file: string): Promise<SyncFailure[]> {
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'))
  if (!raw || typeof raw !== 'object' || !('failures' in raw) || !Array.isArray(raw.failures)) throw new Error('Invalid failure file')
  return raw.failures.filter((failure): failure is SyncFailure => Boolean(failure && typeof failure === 'object' && 'provider' in failure && 'stage' in failure))
}
