import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AnimeSyncStore } from './firebaseAdminStore'
import { fetchIncrementalCandidates, incrementalCategoryKey } from './incremental'
import { sourceMappingId } from './identity'
import { AnimeRawCache } from './rawCache'
import { providerConfig, vodItem } from './testFixtures'
import type { AnimeUpstreamProvider, IncrementalSyncState, MacCmsVodItem, SourceMapping, SyncOperationCounts, SyncOptions } from './types'

const directories: string[] = []
const categoryName = '\u65e5\u97e9\u52a8\u6f2b'
const contentGroupTargets = {
  china_anime: 0, east_asia_anime: 1, western_anime: 0,
  hong_kong_taiwan_anime: 0, overseas_anime: 0, animation_movie: 0,
} as const

async function cache() {
  const directory = await mkdtemp(path.join(tmpdir(), 'edenos-anime-incremental-'))
  directories.push(directory)
  return new AnimeRawCache(directory, 'test-run')
}

function item(id: string, time: string, title = `Anime ${id}`): MacCmsVodItem {
  return vodItem({ vod_id: id, vod_name: title, vod_time: time, type_id: 30, type_name: categoryName, vod_area: '\u65e5\u672c' })
}

function provider(pages: MacCmsVodItem[][], pageCount = pages.length) {
  const all = new Map(pages.flat().map((entry) => [String(entry.vod_id), entry]))
  const fetchPage = vi.fn(async (page: number) => ({
    page,
    pageCount,
    limit: pages[page - 1]?.length ?? pages[0]?.length ?? 20,
    total: pageCount * (pages[0]?.length ?? 20),
    items: pages[page - 1] ?? [],
    raw: { page },
  }))
  const fetchDetails = vi.fn(async (ids: string[]) => ({ items: ids.flatMap((id) => all.get(id) ?? []), raw: { ids } }))
  const upstream: AnimeUpstreamProvider = {
    config: providerConfig(),
    stats: { requests: 0, retries: 0, failures: 0 },
    probe: async () => ({ providerId: 'provider-a', reachable: true, validJson: true, hasPagination: true, hasDetail: true, hasPlayback: true, incrementalSupported: false, message: 'test' }),
    fetchCategories: async () => [{ id: '30', name: categoryName }],
    fetchPage,
    fetchDetail: async (id) => ({ item: all.get(id)!, raw: {} }),
    fetchDetails,
  }
  return { upstream, fetchPage, fetchDetails }
}

function operations(): SyncOperationCounts {
  return {
    firestoreReads: 1, firestoreWrites: 0, firestoreDeletes: 0,
    sourceMapReads: 0, sourceMapWrites: 0, syncStateReads: 0, syncStateWrites: 0,
    checkpointReads: 0, checkpointWrites: 0, incrementalStateReads: 1, incrementalStateWrites: 0,
    r2Reads: 0, r2Writes: 0, r2Deletes: 0, r2UnchangedSkipped: 0,
  }
}

function options(overrides: Partial<SyncOptions> = {}): SyncOptions {
  return {
    mode: 'incremental', dryRun: true, probeOnly: false, probeMedia: false, concurrency: 3, cleanup: 'none',
    controlled: true, contentGroupTargets, maxFirestoreReads: 10_000, maxFirestoreWrites: 3_000,
    operationSafetyMargin: 100, incrementalMaxPages: 5, incrementalKnownPages: 2,
    ...overrides,
  }
}

function state(time: number, ids: string[] = []): IncrementalSyncState {
  return {
    version: 1,
    updatedAtMs: time,
    categories: {
      [incrementalCategoryKey('provider-a', '30')]: {
        provider: 'provider-a', categoryId: '30', contentGroup: 'east_asia_anime',
        watermarkUpdatedAtMs: time, watermarkProviderItemIds: ids,
      },
    },
  }
}

function store(mappings: Map<string, SourceMapping>): AnimeSyncStore {
  return {
    getSourceMappings: async (keys) => new Map(keys.flatMap((key) => {
      const id = sourceMappingId(key.provider, key.providerItemId)
      const mapping = mappings.get(id)
      return mapping ? [[id, mapping] as const] : []
    })),
    getStates: async () => new Map(), publish: async () => undefined,
    listCatalogue: async () => [], listAllSourceMappings: async () => [], findProgressExternalIds: async () => [],
    deleteCatalogue: async () => undefined, deleteInternalMetadata: async () => undefined,
  }
}

function mapped(ids: string[]): Map<string, SourceMapping> {
  return new Map(ids.map((id) => [sourceMappingId('provider-a', id), {
    provider: 'provider-a', providerItemId: id, canonicalExternalId: `canonical-${id}`, matchedBy: 'source-map' as const,
  }]))
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('incremental Anime discovery', () => {
  it('skips already-known source rows and stops at the configured known-page boundary', async () => {
    const pages = [
      [item('4', '2026-09-22 04:00:00'), item('3', '2026-09-22 03:00:00')],
      [item('2', '2026-09-22 02:00:00'), item('1', '2026-09-22 01:00:00')],
      [item('0', '2026-09-21 23:00:00')],
    ]
    const { upstream, fetchPage, fetchDetails } = provider(pages)
    const result = await fetchIncrementalCandidates({
      providers: [upstream], store: store(mapped(['1', '2', '3', '4'])), cache: await cache(), options: options(),
      operations: operations(), failures: [], start: state(Date.parse('2026-09-22T04:00:00Z'), ['4']), now: Date.now(),
    })
    expect(result).toMatchObject({ providerRowsScanned: 4, knownRowsSkipped: 4, safeToAdvance: true, stopReason: 'incremental caught up' })
    expect(result.itemsByProvider.get('provider-a') ?? []).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchDetails).not.toHaveBeenCalled()
  })

  it('discovers an unmapped new row and keeps mapped older rows out of detail fetches', async () => {
    const pages = [
      [item('new', '2026-09-23 08:00:00'), item('known-2', '2026-09-22 02:00:00')],
      [item('known-1', '2026-09-22 01:00:00')],
    ]
    const { upstream, fetchDetails } = provider(pages)
    const result = await fetchIncrementalCandidates({
      providers: [upstream], store: store(mapped(['known-1', 'known-2'])), cache: await cache(), options: options({ incrementalKnownPages: 1 }),
      operations: operations(), failures: [], start: state(Date.parse('2026-09-22T02:00:00Z'), ['known-2']), now: Date.now(),
    })
    expect(result.itemsByProvider.get('provider-a')?.map((entry) => entry.vod_id)).toEqual(['new'])
    expect(result.knownRowsSkipped).toBe(2)
    expect(fetchDetails).toHaveBeenCalledWith(['new'])
  })

  it('reprocesses a mapped row when its provider update time is newer than the watermark', async () => {
    const changed = item('known', '2026-09-23 08:00:00')
    const { upstream, fetchDetails } = provider([[changed]])
    const result = await fetchIncrementalCandidates({
      providers: [upstream], store: store(mapped(['known'])), cache: await cache(), options: options(),
      operations: operations(), failures: [], start: state(Date.parse('2026-09-22T08:00:00Z')), now: Date.now(),
    })
    expect(result.itemsByProvider.get('provider-a')?.map((entry) => entry.vod_id)).toEqual(['known'])
    expect(fetchDetails).toHaveBeenCalledWith(['known'])
  })

  it('never expands into a full historical scan when no covered boundary is found', async () => {
    const pages = Array.from({ length: 100 }, (_, index) => [item(String(100 - index), `2026-09-${String(23 - Math.min(index, 22)).padStart(2, '0')} 08:00:00`)])
    const { upstream, fetchPage } = provider(pages, 100)
    const result = await fetchIncrementalCandidates({
      providers: [upstream], store: store(new Map()), cache: await cache(), options: options({ incrementalMaxPages: 2, incrementalKnownPages: 2 }),
      operations: operations(), failures: [], start: state(Date.parse('2026-09-01T00:00:00Z')), now: Date.now(),
    })
    expect(result).toMatchObject({ safeToAdvance: false, stopReason: 'scan window', providerRowsScanned: 2 })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })
})
