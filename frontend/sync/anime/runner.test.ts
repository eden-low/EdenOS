import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contentHash } from './stableJson'
import { sourceMappingId } from './identity'
import { createMacCmsProvider } from './macCmsProvider'
import { runAnimeSync } from './runner'
import { envelope, providerConfig, vodItem } from './testFixtures'
import { AnimeRawCache } from './rawCache'
import type { AnimeDetailStore } from './r2Store'
import type { AnimeSyncStore } from './firebaseAdminStore'
import type { PreparedCanonicalWrite, SourceMapping, SyncOptions, SyncState } from './types'

const directories: string[] = []
const options: SyncOptions = { mode: 'incremental', dryRun: true, probeOnly: false, probeMedia: false, concurrency: 3, cleanup: 'none' }

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'edenos-anime-sync-'))
  directories.push(directory)
  return directory
}

function provider() {
  const item = vodItem()
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    return new Response(JSON.stringify(envelope([url.searchParams.get('ac') === 'detail' ? item : { vod_id: item.vod_id, vod_name: item.vod_name }])), { status: 200 })
  })
  return createMacCmsProvider(providerConfig(), { fetcher })
}

function memoryStore(states = new Map<string, SyncState>(), events: string[] = [], mappings = new Map<string, SourceMapping>()) {
  const publish = vi.fn(async (_writes: PreparedCanonicalWrite[], _mappings: SourceMapping[]) => { events.push('firestore') })
  const store: AnimeSyncStore = {
    getSourceMappings: async () => mappings,
    getStates: async () => states,
    publish,
    listCatalogue: async () => [],
    listAllSourceMappings: async () => [],
    findProgressExternalIds: async () => [],
    deleteCatalogue: async () => undefined,
    deleteInternalMetadata: async () => undefined,
  }
  return { store, publish }
}

function memoryR2(events: string[] = [], existing = new Map()) {
  const put = vi.fn(async (detail) => { events.push('r2'); existing.set(detail.externalId, detail) })
  const detailStore: AnimeDetailStore = {
    get: async (id) => existing.get(id) ?? null,
    exists: async (id) => existing.has(id),
    put,
    remove: async (id) => { existing.delete(id) },
  }
  return { detailStore, put }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('Anime sync runner', () => {
  it('performs a dry run with zero R2, Firestore, and source-map writes', async () => {
    const events: string[] = []
    const { store, publish } = memoryStore(new Map(), events)
    const { detailStore, put } = memoryR2(events)
    const result = await runAnimeSync(options, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary).toMatchObject({ fetched: 1, normalized: 1, canonicalTitles: 1, r2Uploaded: 1, firestoreUpserted: 1 })
    expect(put).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('writes R2 before publishing Firestore and mappings', async () => {
    const events: string[] = []
    const { store, publish } = memoryStore(new Map(), events)
    const { detailStore } = memoryR2(events)
    await runAnimeSync({ ...options, dryRun: false }, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(events).toEqual(['r2', 'firestore'])
    expect(publish.mock.calls[0][1]).toHaveLength(1)
  })

  it('skips unchanged R2 and catalogue writes', async () => {
    const first = await runAnimeSync(options, { providers: [provider()], cacheRoot: await temporaryDirectory() })
    const canonical = first.canonicals[0]
    const states = new Map([[canonical.externalId, { externalId: canonical.externalId, indexHash: contentHash(canonical.index), detailHash: contentHash(canonical.detail), updatedAtMs: 1_700_000_000_000 }]])
    const existing = new Map([[canonical.externalId, canonical.detail]])
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: '101', canonicalExternalId: canonical.externalId, matchedBy: 'deterministic-new' }
    const { store, publish } = memoryStore(states, [], new Map([[sourceMappingId('provider-a', '101'), mapping]]))
    const { detailStore, put } = memoryR2([], existing)
    const result = await runAnimeSync({ ...options, dryRun: false }, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary).toMatchObject({ r2Uploaded: 0, r2Skipped: 1, firestoreUpserted: 0, firestoreSkipped: 1 })
    expect(put).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
  })

  it('publishes the catalogue metadata after a detail-only change', async () => {
    const first = await runAnimeSync(options, { providers: [provider()], cacheRoot: await temporaryDirectory() })
    const canonical = first.canonicals[0]
    const states = new Map([[canonical.externalId, { externalId: canonical.externalId, indexHash: contentHash(canonical.index), detailHash: 'previous-detail-hash', updatedAtMs: 1_700_000_000_000 }]])
    const existing = new Map([[canonical.externalId, canonical.detail]])
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: '101', canonicalExternalId: canonical.externalId, matchedBy: 'deterministic-new' }
    const { store, publish } = memoryStore(states, [], new Map([[sourceMappingId('provider-a', '101'), mapping]]))
    const { detailStore, put } = memoryR2([], existing)
    const result = await runAnimeSync({ ...options, dryRun: false }, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary).toMatchObject({ r2Uploaded: 1, firestoreUpserted: 1, firestoreSkipped: 0 })
    expect(put).toHaveBeenCalledOnce()
    expect(publish).toHaveBeenCalledWith([expect.objectContaining({ indexChanged: false, r2Changed: true })], [])
  })

  it('continues when another provider fails', async () => {
    const failed = createMacCmsProvider(providerConfig({ id: 'failed', baseUrl: new URL('https://failed.example') }), { fetcher: async () => new Response('{}', { status: 503 }), sleep: async () => undefined })
    const result = await runAnimeSync(options, { providers: [failed, provider()], cacheRoot: await temporaryDirectory() })
    expect(result.summary.canonicalTitles).toBe(1)
    expect(result.summary.providerFailures).toBeGreaterThan(0)
  })

  it('replays raw detail cache without contacting the provider', async () => {
    const root = await temporaryDirectory()
    const raw = new AnimeRawCache(root, 'cached-run')
    await raw.writeDetail('provider-a', '101', envelope([vodItem()]))
    const upstream = provider()
    upstream.probe = vi.fn(async () => { throw new Error('must not probe') })
    upstream.fetchPage = vi.fn(async () => { throw new Error('must not list') })
    upstream.fetchDetail = vi.fn(async () => { throw new Error('must not detail') })
    const result = await runAnimeSync({ ...options, fromCache: path.join(root, 'raw', 'cached-run') }, { providers: [upstream], cacheRoot: root })
    expect(result.summary.canonicalTitles).toBe(1)
    expect(upstream.probe).not.toHaveBeenCalled()
    expect(upstream.fetchPage).not.toHaveBeenCalled()
    expect(upstream.fetchDetail).not.toHaveBeenCalled()
  })

  it('does not publish Firestore when R2 upload fails', async () => {
    const { store, publish } = memoryStore()
    const detailStore: AnimeDetailStore = {
      get: async () => null,
      exists: async () => false,
      put: async () => { throw new Error('R2 unavailable') },
      remove: async () => undefined,
    }
    const result = await runAnimeSync({ ...options, dryRun: false }, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.failures).toEqual(expect.arrayContaining([expect.objectContaining({ stage: 'r2' })]))
    expect(publish).not.toHaveBeenCalled()
  })

  it('applies category targets and rejects commentary before canonical publication', async () => {
    const good = vodItem({ vod_id: 'anime-1', vod_name: 'Real Anime', type_id: 30, type_name: '日韩动漫', vod_area: '日本' })
    const commentary = vodItem({ vod_id: 'commentary-1', vod_name: 'Movie【电影解说】', type_id: 30, type_name: '日韩动漫', vod_area: '日本' })
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('ac') === 'detail') {
        const id = url.searchParams.get('ids')
        return new Response(JSON.stringify(envelope([id === 'anime-1' ? good : commentary])))
      }
      return new Response(JSON.stringify(envelope([good, commentary], { class: [{ type_id: 30, type_pid: 4, type_name: '日韩动漫' }] })))
    })
    const contentProvider = createMacCmsProvider(providerConfig(), { fetcher })
    const result = await runAnimeSync({ ...options, contentTargets: { japan: 1, china: 0, europe_us: 0 } }, { providers: [contentProvider], cacheRoot: await temporaryDirectory() })
    expect(result.canonicals).toHaveLength(1)
    expect(result.canonicals[0].index).toMatchObject({ title: 'Real Anime', mediaType: 'anime', region: 'japan' })
    expect(result.summary).toMatchObject({ contentAccepted: { japan: 1, china: 0, europe_us: 0 }, commentaryRejected: 1 })
  })
})
