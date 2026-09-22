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

const controlledContentGroups = {
  china_anime: 0,
  east_asia_anime: 1,
  western_anime: 0,
  hong_kong_taiwan_anime: 0,
  overseas_anime: 0,
  animation_movie: 0,
} as const

function controlledProvider(items = [vodItem({ vod_id: 'new-1', vod_name: 'New One', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' })]) {
  const byId = new Map(items.map((item) => [String(item.vod_id), item]))
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const selected = url.searchParams.get('ac') === 'detail'
      ? (url.searchParams.get('ids') ?? '').split(',').flatMap((id) => byId.get(id) ?? [])
      : items.map((item) => ({ ...item, vod_play_url: null }))
    return new Response(JSON.stringify(envelope(selected, {
      page: 1,
      pagecount: 1,
      total: items.length,
      class: [{ type_id: 30, type_pid: 4, type_name: '\u65e5\u97e9\u52a8\u6f2b' }],
    })))
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

  it('trusts an unchanged sync-state hash without an unnecessary R2 existence request', async () => {
    const first = await runAnimeSync(options, { providers: [provider()], cacheRoot: await temporaryDirectory() })
    const canonical = first.canonicals[0]
    const states = new Map([[canonical.externalId, { externalId: canonical.externalId, indexHash: contentHash(canonical.index), detailHash: contentHash(canonical.detail), updatedAtMs: 1_700_000_000_000 }]])
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: '101', canonicalExternalId: canonical.externalId, matchedBy: 'deterministic-new' }
    const { store, publish } = memoryStore(states, [], new Map([[sourceMappingId('provider-a', '101'), mapping]]))
    const { detailStore } = memoryR2([], new Map([[canonical.externalId, canonical.detail]]))
    detailStore.exists = vi.fn(async () => { throw new Error('must not perform an unchanged HEAD request') })
    const result = await runAnimeSync({ ...options, dryRun: false }, { providers: [provider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.failures).toEqual([])
    expect(result.summary.operations).toMatchObject({ r2Reads: 1, r2Writes: 0, r2UnchangedSkipped: 1 })
    expect(detailStore.exists).not.toHaveBeenCalled()
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

  it('preserves approved-category normalization in an uncapped raw-cache replay', async () => {
    const root = await temporaryDirectory()
    const raw = new AnimeRawCache(root, 'controlled-cache')
    const categoryName = '\u56fd\u4ea7\u52a8\u6f2b'
    await raw.writeDetail('provider-a', '201', envelope([vodItem({ vod_id: '201', vod_name: 'China One', type_id: 24, type_name: categoryName, vod_area: '' })]))
    await raw.writeDetail('provider-a', '202', envelope([vodItem({ vod_id: '202', vod_name: 'China Two', type_id: 24, type_name: categoryName, vod_area: '' })]))
    const result = await runAnimeSync({
      ...options,
      fromCache: path.join(root, 'raw', 'controlled-cache'),
      applyContentPolicy: true,
    }, { providers: [provider()], cacheRoot: root })
    expect(result.canonicals).toHaveLength(2)
    expect(result.canonicals.map((canonical) => canonical.index.region)).toEqual(['china', 'china'])
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

  it('applies broad content groups without treating Korean Anime as Japanese', async () => {
    const korean = vodItem({ vod_id: 'korean-1', vod_name: 'Korean Anime', type_id: 30, type_name: '日韩动漫', vod_area: '韩国' })
    const movie = vodItem({ vod_id: 'movie-1', vod_name: 'Animation Movie', type_id: 49, type_name: '动画片', vod_area: '美国', vod_class: '动画' })
    const items = new Map([[String(korean.vod_id), korean], [String(movie.vod_id), movie]])
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.searchParams.get('ac') === 'detail') {
        return new Response(JSON.stringify(envelope((url.searchParams.get('ids') ?? '').split(',').flatMap((id) => items.get(id) ?? []))))
      }
      const category = url.searchParams.get('t')
      const list = category === '30' ? [korean] : category === '49' ? [movie] : [korean, movie]
      return new Response(JSON.stringify(envelope(list, { class: [
        { type_id: 30, type_pid: 4, type_name: '日韩动漫' },
        { type_id: 49, type_pid: 1, type_name: '动画片' },
      ] })))
    })
    const contentProvider = createMacCmsProvider(providerConfig(), { fetcher })
    const contentGroupTargets = { china_anime: 0, east_asia_anime: 1, western_anime: 0, hong_kong_taiwan_anime: 0, overseas_anime: 0, animation_movie: 1 } as const
    const result = await runAnimeSync({ ...options, contentGroupTargets }, { providers: [contentProvider], cacheRoot: await temporaryDirectory() })
    expect(result.canonicals.map((canonical) => canonical.index)).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Korean Anime', mediaType: 'anime', region: 'korea' }),
      expect.objectContaining({ title: 'Animation Movie', mediaType: 'movie', region: 'europe_us', genres: expect.arrayContaining(['Animation']) }),
    ]))
    expect(result.summary).toMatchObject({ contentAccepted: { korea: 1, europe_us: 1 }, mediaTypeAccepted: { anime: 1, movie: 1 } })
  })

  it('reports a controlled dry run without Firestore, source-map, checkpoint, or R2 writes', async () => {
    const candidates = [
      vodItem({ vod_id: 'new-1', vod_name: 'New One', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' }),
      vodItem({ vod_id: 'new-2', vod_name: 'New Two', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' }),
    ]
    const publish = vi.fn(async () => undefined)
    const saveCheckpoint = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async () => new Map(),
      publish,
      getCheckpoint: async () => null,
      saveCheckpoint,
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const { detailStore, put } = memoryR2()
    const result = await runAnimeSync({
      ...options,
      controlled: true,
      maxTitles: 2,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 12_000,
      operationSafetyMargin: 100,
    }, { providers: [controlledProvider(candidates)], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary).toMatchObject({ canonicalCreated: 2, canonicalTitles: 2, plannedFirestoreWrites: 6, plannedR2Writes: 2, stopReason: 'title cap' })
    expect(result.summary.operations).toMatchObject({ firestoreReads: 5, firestoreWrites: 0, sourceMapWrites: 0, syncStateWrites: 0, checkpointWrites: 0, r2Writes: 0 })
    expect(publish).not.toHaveBeenCalled()
    expect(saveCheckpoint).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('stops before the write budget and leaves the checkpoint on the uncommitted title', async () => {
    const publish = vi.fn(async () => undefined)
    const saveCheckpoint = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async () => new Map(),
      publish,
      getCheckpoint: async () => null,
      saveCheckpoint,
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const { detailStore, put } = memoryR2()
    const result = await runAnimeSync({
      ...options,
      dryRun: false,
      controlled: true,
      maxTitles: 1,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 3,
      operationSafetyMargin: 1,
    }, { providers: [controlledProvider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary.stopReason).toBe('write budget')
    expect(result.summary.operations).toMatchObject({ firestoreWrites: 1, checkpointWrites: 1, r2Writes: 0 })
    expect(saveCheckpoint).toHaveBeenCalledWith('controlled-v1', expect.objectContaining({ page: 1, offset: 0, complete: false }))
    expect(publish).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('publishes a new controlled title within budget and checkpoints once', async () => {
    const publish = vi.fn(async () => undefined)
    const saveCheckpoint = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async () => new Map(),
      publish,
      getCheckpoint: async () => null,
      saveCheckpoint,
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const { detailStore, put } = memoryR2()
    const result = await runAnimeSync({
      ...options,
      dryRun: false,
      controlled: true,
      maxTitles: 1,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 12_000,
      operationSafetyMargin: 100,
    }, { providers: [controlledProvider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary.operations).toMatchObject({ firestoreWrites: 4, sourceMapWrites: 1, syncStateWrites: 1, checkpointWrites: 1, r2Writes: 1 })
    expect(publish).toHaveBeenCalledWith([expect.objectContaining({ indexChanged: true, r2Changed: true })], [expect.objectContaining({ providerItemId: 'new-1' })])
    expect(put).toHaveBeenCalledOnce()
    expect(saveCheckpoint).toHaveBeenCalledOnce()
    expect(saveCheckpoint).toHaveBeenCalledWith('controlled-v1', expect.objectContaining({ complete: true }))
  })

  it('retains the checkpoint and logs source diagnostics when canonical output fails before a write-budget stop', async () => {
    const candidates = [
      vodItem({ vod_id: 'broken-1', vod_name: 'Broken Title', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' }),
      vodItem({ vod_id: 'next-2', vod_name: 'Next Title', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' }),
    ]
    const publish = vi.fn(async () => undefined)
    const saveCheckpoint = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async (ids) => new Map([[ids[0], { externalId: ids[0], indexHash: 'old', detailHash: 'old', updatedAtMs: 1 }]]),
      publish,
      getCheckpoint: async () => ({ version: 1, providerIndex: 0, categoryIndex: 0, page: 1, offset: 0, updatedAtMs: 1, complete: false }),
      saveCheckpoint,
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const detailStore: AnimeDetailStore = {
      get: async () => { throw new Error('R2 GET failed at https://private.example/detail?token=hidden') },
      exists: async () => false,
      put: vi.fn(async () => undefined),
      remove: async () => undefined,
    }
    const log = vi.fn()
    const result = await runAnimeSync({
      ...options,
      dryRun: false,
      controlled: true,
      maxTitles: 2,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 3,
      operationSafetyMargin: 1,
    }, { providers: [controlledProvider(candidates)], cacheRoot: await temporaryDirectory(), store, detailStore, log })
    expect(result.summary.stopReason).toBe('error threshold')
    expect(result.summary.checkpoint).toMatchObject({ providerIndex: 0, categoryIndex: 0, page: 1, offset: 0 })
    expect(result.summary.operations.checkpointWrites).toBe(0)
    expect(saveCheckpoint).not.toHaveBeenCalled()
    expect(publish).not.toHaveBeenCalled()
    expect(result.failures).toEqual([expect.objectContaining({
      provider: 'provider-a', providerItemId: 'broken-1', stage: 'normalize', errorCode: 'canonical-output',
      sources: [expect.objectContaining({ providerItemId: 'broken-1', title: 'Broken Title', cursor: { providerIndex: 0, categoryIndex: 0, page: 1, offset: 0 } })],
      message: 'R2 GET failed at [redacted-url]', errorName: 'Error',
    })])
    const diagnostic = log.mock.calls.map(([message]) => String(message)).find((message) => message.startsWith('Canonical-output failure:'))
    expect(diagnostic).toContain('broken-1')
    expect(diagnostic).toContain('Broken Title')
    expect(diagnostic).toContain('canonical-output')
    expect(diagnostic).not.toContain('private.example')
    expect(diagnostic).not.toContain('hidden')
  })

  it('stops a controlled scan before exceeding the read budget', async () => {
    const store: AnimeSyncStore = {
      getSourceMappings: vi.fn(async () => new Map()),
      getStates: vi.fn(async () => new Map()),
      publish: vi.fn(async () => undefined),
      getCheckpoint: async () => null,
      saveCheckpoint: vi.fn(async () => undefined),
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const result = await runAnimeSync({
      ...options,
      controlled: true,
      maxTitles: 1,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 2,
      maxFirestoreWrites: 12_000,
      operationSafetyMargin: 0,
    }, { providers: [controlledProvider()], cacheRoot: await temporaryDirectory(), store, detailStore: memoryR2().detailStore })
    expect(result.summary).toMatchObject({ stopReason: 'read budget', canonicalTitles: 0 })
    expect(result.summary.operations).toMatchObject({ firestoreReads: 1, checkpointReads: 1, sourceMapReads: 0 })
    expect(store.getSourceMappings).not.toHaveBeenCalled()
  })

  it('resumes a controlled page from its persisted item offset', async () => {
    const first = vodItem({ vod_id: 'new-1', vod_name: 'First', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' })
    const second = vodItem({ vod_id: 'new-2', vod_name: 'Second', type_id: 30, type_name: '\u65e5\u97e9\u52a8\u6f2b', vod_area: '\u65e5\u672c' })
    const publish = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async () => new Map(),
      publish,
      getCheckpoint: async () => ({ version: 1, providerIndex: 0, categoryIndex: 0, page: 1, offset: 1, updatedAtMs: 1, complete: false }),
      saveCheckpoint: vi.fn(async () => undefined),
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    await runAnimeSync({
      ...options,
      dryRun: false,
      controlled: true,
      maxTitles: 1,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 12_000,
      operationSafetyMargin: 100,
    }, { providers: [controlledProvider([first, second])], cacheRoot: await temporaryDirectory(), store, detailStore: memoryR2().detailStore })
    expect(publish).toHaveBeenCalledWith(expect.any(Array), [expect.objectContaining({ providerItemId: 'new-2' })])
  })

  it('rewinds the controlled checkpoint when an R2 write fails', async () => {
    const publish = vi.fn(async () => undefined)
    const saveCheckpoint = vi.fn(async () => undefined)
    const store: AnimeSyncStore = {
      getSourceMappings: async () => new Map(),
      getStates: async () => new Map(),
      publish,
      getCheckpoint: async () => null,
      saveCheckpoint,
      listCatalogue: async () => [],
      listAllSourceMappings: async () => [],
      findProgressExternalIds: async () => [],
      deleteCatalogue: async () => undefined,
      deleteInternalMetadata: async () => undefined,
    }
    const detailStore: AnimeDetailStore = {
      get: async () => null,
      exists: async () => false,
      put: async () => { throw new Error('R2 unavailable') },
      remove: async () => undefined,
    }
    const result = await runAnimeSync({
      ...options,
      dryRun: false,
      controlled: true,
      maxTitles: 1,
      contentGroupTargets: controlledContentGroups,
      maxFirestoreReads: 30_000,
      maxFirestoreWrites: 12_000,
      operationSafetyMargin: 100,
    }, { providers: [controlledProvider()], cacheRoot: await temporaryDirectory(), store, detailStore })
    expect(result.summary.stopReason).toBe('error threshold')
    expect(publish).not.toHaveBeenCalled()
    expect(saveCheckpoint).not.toHaveBeenCalled()
    expect(result.summary.operations.checkpointWrites).toBe(0)
  })
})
