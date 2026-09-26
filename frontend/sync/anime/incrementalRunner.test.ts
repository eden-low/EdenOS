import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contentHash } from './stableJson'
import { incrementalCategoryKey } from './incremental'
import { sourceMappingId } from './identity'
import { createMacCmsProvider } from './macCmsProvider'
import { runAnimeSync } from './runner'
import { envelope, providerConfig, vodItem } from './testFixtures'
import type { AnimeDetailStore } from './r2Store'
import type { AnimeSyncStore } from './firebaseAdminStore'
import type { IncrementalSyncState, PreparedCanonicalWrite, SourceMapping, SyncOptions, SyncState } from './types'

const directories: string[] = []
const categoryName = '\u65e5\u97e9\u52a8\u6f2b'
const contentGroupTargets = {
  china_anime: 0, east_asia_anime: 1, western_anime: 0,
  hong_kong_taiwan_anime: 0, overseas_anime: 0, animation_movie: 0,
} as const

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'edenos-anime-incremental-runner-'))
  directories.push(directory)
  return directory
}

function upstream(overrides: Parameters<typeof vodItem>[0] = {}) {
  const item = vodItem({
    vod_id: 'known-1', vod_name: 'Known Anime', vod_time: '2026-09-23 08:00:00',
    type_id: 30, type_name: categoryName, vod_area: '\u65e5\u672c', ...overrides,
  })
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    const list = url.searchParams.get('ac') === 'detail'
      ? (url.searchParams.get('ids') ?? String(item.vod_id)).split(',').includes(String(item.vod_id)) ? [item] : []
      : [{ ...item, vod_play_url: null }]
    return new Response(JSON.stringify(envelope(list, {
      page: 1, pagecount: 1, total: 1,
      class: [{ type_id: 30, type_pid: 4, type_name: categoryName }],
    })))
  })
  return createMacCmsProvider(providerConfig(), { fetcher })
}

function incrementalState(time = Date.parse('2026-09-22T08:00:00Z')): IncrementalSyncState {
  return {
    version: 1,
    updatedAtMs: time,
    categories: {
      [incrementalCategoryKey('provider-a', '30')]: {
        provider: 'provider-a', categoryId: '30', contentGroup: 'east_asia_anime',
        watermarkUpdatedAtMs: time, watermarkProviderItemIds: [],
      },
    },
  }
}

function options(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    mode: 'incremental', dryRun: true, probeOnly: false, probeMedia: false, concurrency: 3, cleanup: 'none',
    controlled: true, contentGroupTargets, maxFirestoreReads: 10_000, maxFirestoreWrites: 3_000,
    operationSafetyMargin: 100, incrementalStateId: 'anime-incremental-v1', incrementalMaxPages: 5, incrementalKnownPages: 1,
    ...overrides,
  }
}

function detailStore(existing = new Map<string, unknown>()) {
  const put = vi.fn(async (detail) => { existing.set(detail.externalId, detail) })
  const store: AnimeDetailStore = {
    get: async (id) => existing.get(id) as Awaited<ReturnType<AnimeDetailStore['get']>> ?? null,
    exists: async (id) => existing.has(id),
    put,
    remove: async (id) => { existing.delete(id) },
  }
  return { store, put }
}

function syncStore(input: {
  mappings?: Map<string, SourceMapping>
  states?: Map<string, SyncState>
  state?: IncrementalSyncState | null
} = {}) {
  const mappings = input.mappings ?? new Map<string, SourceMapping>()
  const publish = vi.fn(async (_writes: PreparedCanonicalWrite[], _mappings: SourceMapping[]) => undefined)
  const saveIncrementalState = vi.fn(async () => undefined)
  const saveCatalogueStatus = vi.fn(async () => undefined)
  const getCheckpoint = vi.fn(async () => { throw new Error('historical checkpoint must not be read') })
  const store: AnimeSyncStore = {
    getSourceMappings: async (keys) => new Map(keys.flatMap((key) => {
      const id = sourceMappingId(key.provider, key.providerItemId)
      const mapping = mappings.get(id)
      return mapping ? [[id, mapping] as const] : []
    })),
    getStates: async (ids) => new Map(ids.flatMap((id) => {
      const state = input.states?.get(id)
      return state ? [[id, state] as const] : []
    })),
    publish,
    getCheckpoint,
    saveCheckpoint: vi.fn(async () => undefined),
    getIncrementalState: vi.fn(async () => input.state ?? null),
    saveIncrementalState,
    getCatalogueCount: vi.fn(async () => 11870),
    saveCatalogueStatus,
    listCatalogue: async () => [], listAllSourceMappings: async () => [], findProgressExternalIds: async () => [],
    deleteCatalogue: async () => undefined, deleteInternalMetadata: async () => undefined,
  }
  return { store, publish, saveIncrementalState, saveCatalogueStatus, getCheckpoint }
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('controlled incremental Anime runner', () => {
  it('uses separate incremental state, leaves the completed historical checkpoint alone, and dry-runs with zero writes', async () => {
    const { store, publish, saveIncrementalState, getCheckpoint } = syncStore({ state: null })
    const r2 = detailStore()
    const result = await runAnimeSync(options(), { providers: [upstream({ vod_id: 'new-1' })], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store })
    expect(getCheckpoint).not.toHaveBeenCalled()
    expect(result.summary).toMatchObject({ canonicalCreated: 1, stopReason: 'incremental caught up' })
    expect(result.summary.operations).toMatchObject({ firestoreWrites: 0, r2Writes: 0, checkpointReads: 0, incrementalStateReads: 1, incrementalStateWrites: 0 })
    expect(publish).not.toHaveBeenCalled()
    expect(saveIncrementalState).not.toHaveBeenCalled()
    expect(r2.put).not.toHaveBeenCalled()
  })

  it('publishes a changed mapped Anime and advances incremental state safely', async () => {
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: 'known-1', canonicalExternalId: 'canonical-known', matchedBy: 'source-map' }
    const states = new Map([['canonical-known', { externalId: 'canonical-known', indexHash: 'old', detailHash: 'old', updatedAtMs: 1 }]])
    const { store, publish, saveIncrementalState, saveCatalogueStatus } = syncStore({ mappings: new Map([[sourceMappingId('provider-a', 'known-1'), mapping]]), states, state: incrementalState() })
    const r2 = detailStore()
    const result = await runAnimeSync(options({ dryRun: false }), { providers: [upstream()], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store })
    expect(result.summary).toMatchObject({ canonicalUpdated: 1, stopReason: 'incremental caught up' })
    expect(publish).toHaveBeenCalledOnce()
    expect(r2.put).toHaveBeenCalledOnce()
    expect(saveIncrementalState).toHaveBeenCalledOnce()
    expect(saveCatalogueStatus).toHaveBeenCalledWith({ catalogueCount: 11870, lastSuccessfulSyncAtMs: expect.any(Number) })
    expect(publish.mock.calls[0][0][0]).toMatchObject({ isNew: false })
  })

  it('marks only newly discovered canonical titles for first-publication metadata', async () => {
    const { store, publish } = syncStore({ state: incrementalState() })
    const r2 = detailStore()
    await runAnimeSync(options({ dryRun: false }), { providers: [upstream({ vod_id: 'new-1' })], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store })
    expect(publish.mock.calls[0][0][0]).toMatchObject({ isNew: true })
  })

  it('produces no catalogue or R2 write when a recent mapped canonical is unchanged', async () => {
    const first = await runAnimeSync({ ...options(), controlled: false }, { providers: [upstream()], cacheRoot: await temporaryDirectory() })
    const canonical = first.canonicals[0]
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: 'known-1', canonicalExternalId: canonical.externalId, matchedBy: 'source-map' }
    const states = new Map([[canonical.externalId, {
      externalId: canonical.externalId, indexHash: contentHash(canonical.index), detailHash: contentHash(canonical.detail), updatedAtMs: 1,
    }]])
    const { store, publish, saveIncrementalState } = syncStore({ mappings: new Map([[sourceMappingId('provider-a', 'known-1'), mapping]]), states, state: incrementalState() })
    const r2 = detailStore(new Map([[canonical.externalId, canonical.detail]]))
    const result = await runAnimeSync(options({ dryRun: false }), { providers: [upstream()], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store })
    expect(result.summary).toMatchObject({ canonicalUpdated: 0, unchangedTitlesSkipped: 1, firestoreUpserted: 0, r2Uploaded: 0 })
    expect(publish).not.toHaveBeenCalled()
    expect(r2.put).not.toHaveBeenCalled()
    expect(saveIncrementalState).toHaveBeenCalledOnce()
    expect(result.summary.operations).toMatchObject({ incrementalStateWrites: 1, r2Writes: 0 })
  })

  it('retains incremental state when canonical output has an unresolved failure', async () => {
    const mapping: SourceMapping = { provider: 'provider-a', providerItemId: 'known-1', canonicalExternalId: 'canonical-known', matchedBy: 'source-map' }
    const states = new Map([['canonical-known', { externalId: 'canonical-known', indexHash: 'old', detailHash: 'old', updatedAtMs: 1 }]])
    const { store, publish, saveIncrementalState } = syncStore({ mappings: new Map([[sourceMappingId('provider-a', 'known-1'), mapping]]), states, state: incrementalState() })
    const r2 = detailStore()
    r2.store.get = vi.fn(async () => { throw new Error('R2 read failed') })
    const result = await runAnimeSync(options({ dryRun: false }), { providers: [upstream()], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store })
    expect(result.summary.stopReason).toBe('error threshold')
    expect(result.failures).toEqual([expect.objectContaining({ errorCode: 'canonical-output', providerItemId: 'known-1' })])
    expect(publish).not.toHaveBeenCalled()
    expect(saveIncrementalState).not.toHaveBeenCalled()
  })

  it('replays the same incremental watermark after a write-budget stop and advances on a later safe retry', async () => {
    const { store, saveIncrementalState } = syncStore({ state: incrementalState() })
    const r2 = detailStore()
    const first = await runAnimeSync(options({ dryRun: false, maxFirestoreWrites: 3, operationSafetyMargin: 1 }), {
      providers: [upstream({ vod_id: 'new-1' })], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store,
    })
    expect(first.summary.stopReason).toBe('write budget')
    expect(saveIncrementalState).not.toHaveBeenCalled()
    const second = await runAnimeSync(options({ dryRun: false }), {
      providers: [upstream({ vod_id: 'new-1' })], cacheRoot: await temporaryDirectory(), store, detailStore: r2.store,
    })
    expect(second.summary.stopReason).toBe('incremental caught up')
    expect(saveIncrementalState).toHaveBeenCalledOnce()
  })
})
