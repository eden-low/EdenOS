import path from 'node:path'
import { contentHash } from './stableJson'
import { mapConcurrent } from './http'
import { resolveCanonicalIdentity, sourceMappingId } from './identity'
import { mergeCanonicalAnime } from './merge'
import { normalizeProviderAnime } from './normalize'
import { probeMediaUrl } from './mediaProbe'
import { AnimeRawCache, readCachedDetails, readFailureFile, type RawRunManifest } from './rawCache'
import type { AnimeDetailStore } from './r2Store'
import type { AnimeSyncStore } from './firebaseAdminStore'
import type {
  AnimeProviderConfig,
  AnimeUpstreamProvider,
  CanonicalAnime,
  MacCmsVodItem,
  PreparedCanonicalWrite,
  ProviderAnimeRecord,
  SourceMapping,
  SyncFailure,
  SyncOptions,
  SyncSummary,
} from './types'

export interface AnimeSyncDependencies {
  providers: AnimeUpstreamProvider[]
  cacheRoot: string
  store?: AnimeSyncStore
  detailStore?: AnimeDetailStore
  now?: () => number
  log?: (message: string) => void
  mediaProbe?: typeof probeMediaUrl
}

export interface AnimeSyncResult {
  summary: SyncSummary
  failures: SyncFailure[]
  canonicals: CanonicalAnime[]
  probes: Awaited<ReturnType<AnimeUpstreamProvider['probe']>>[]
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : 'Unknown sync error'
}

function runId(now: number): string {
  return new Date(now).toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

async function fetchProvider(
  provider: AnimeUpstreamProvider,
  cache: AnimeRawCache,
  options: SyncOptions,
  failures: SyncFailure[],
): Promise<{ items: MacCmsVodItem[]; pages: number }> {
  if (options.retryFailed) {
    const retryEntries = (await readFailureFile(options.retryFailed)).filter((failure) => failure.provider === provider.config.id && failure.providerItemId)
    const results = await mapConcurrent(retryEntries, options.concurrency, async (failure) => {
      const detail = await provider.fetchDetail(failure.providerItemId!)
      await cache.writeDetail(provider.config.id, failure.providerItemId!, detail.raw)
      return detail.item
    })
    return { items: results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [result.value]
      failures.push({ provider: provider.config.id, providerItemId: retryEntries[index].providerItemId, stage: 'detail', errorCode: 'retry-failed', message: safeMessage(result.reason) })
      return []
    }), pages: 0 }
  }
  const listItems: MacCmsVodItem[] = []
  let pageNumber = 1
  let pageCount = 1
  let fetchedPages = 0
  do {
    try {
      const page = await provider.fetchPage(pageNumber)
      await cache.writePage(provider.config.id, pageNumber, page.raw)
      fetchedPages += 1
      listItems.push(...page.items)
      pageCount = page.pageCount
      pageNumber += 1
    } catch (error) {
      failures.push({ provider: provider.config.id, stage: 'list', errorCode: 'provider-list', message: safeMessage(error) })
      break
    }
  } while (pageNumber <= pageCount && (!options.limit || listItems.length < options.limit))
  const limited = options.limit ? listItems.slice(0, options.limit) : listItems
  const unique = [...new Map(limited.flatMap((item) => item.vod_id === undefined || item.vod_id === null ? [] : [[String(item.vod_id), item]])).keys()]
  const details = await mapConcurrent(unique, options.concurrency, async (providerItemId) => {
    const detail = await provider.fetchDetail(providerItemId)
    await cache.writeDetail(provider.config.id, providerItemId, detail.raw)
    return detail.item
  })
  return { items: details.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value]
    failures.push({ provider: provider.config.id, providerItemId: unique[index], stage: 'detail', errorCode: 'provider-detail', message: safeMessage(result.reason) })
    return []
  }), pages: fetchedPages }
}

async function cachedProviderRecords(options: SyncOptions, configs: AnimeProviderConfig[]): Promise<Map<string, MacCmsVodItem[]>> {
  if (!options.fromCache) return new Map()
  const directory = path.resolve(options.fromCache)
  const records = await readCachedDetails(directory)
  const configured = new Set(configs.map((config) => config.id))
  const missing = [...records.keys()].filter((provider) => !configured.has(provider))
  if (missing.length) throw new Error(`Cached providers require configuration: ${missing.join(', ')}`)
  return records
}

function selectedProviders(providers: AnimeUpstreamProvider[], requested?: string[]): AnimeUpstreamProvider[] {
  return requested?.length ? providers.filter((provider) => requested.includes(provider.config.id)) : providers
}

function writeTimestamp(canonical: CanonicalAnime, previous: { updatedAtMs: number } | undefined, changed: boolean, now: number): number {
  if (!changed && previous) return previous.updatedAtMs
  return canonical.providerUpdatedAt ?? now
}

export async function runAnimeSync(options: SyncOptions, dependencies: AnimeSyncDependencies): Promise<AnimeSyncResult> {
  const started = dependencies.now?.() ?? Date.now()
  const id = runId(started)
  const log = dependencies.log ?? (() => undefined)
  const failures: SyncFailure[] = []
  const cache = new AnimeRawCache(dependencies.cacheRoot, id)
  const providers = selectedProviders(dependencies.providers, options.providerIds)
  if (!providers.length) throw new Error('No Anime sync providers are configured for this run')
  const probes = options.fromCache
    ? providers.map((provider) => ({ providerId: provider.config.id, reachable: true, validJson: true, hasPagination: true, hasDetail: true, hasPlayback: true, incrementalSupported: false, message: 'Replayed from raw cache without an upstream request.' }))
    : await Promise.all(providers.map((provider) => provider.probe()))
  if (options.probeOnly) {
    return {
      summary: { runId: id, mode: options.mode, providers: providers.map((provider) => provider.config.id), fetched: 0, normalized: 0, canonicalTitles: 0, mergedDuplicates: 0, r2Uploaded: 0, r2Skipped: 0, firestoreUpserted: 0, firestoreSkipped: 0, providerFailures: probes.filter((probe) => !probe.reachable).length, itemFailures: 0, ambiguousMatches: 0, unsupportedPlaybackUrls: 0, elapsedMs: (dependencies.now?.() ?? Date.now()) - started },
      failures,
      canonicals: [],
      probes,
    }
  }
  const cached = await cachedProviderRecords(options, providers.map((provider) => provider.config))
  const rawByProvider = new Map<string, MacCmsVodItem[]>()
  const manifest: RawRunManifest = { runId: id, mode: options.mode, startedAt: new Date(started).toISOString(), providers: {} }
  for (const provider of providers) {
    const beforeFailures = failures.length
    const fetched = options.fromCache ? { items: cached.get(provider.config.id) ?? [], pages: 0 } : await fetchProvider(provider, cache, options, failures)
    rawByProvider.set(provider.config.id, fetched.items)
    manifest.providers[provider.config.id] = { pages: fetched.pages, itemCount: fetched.items.length, failures: failures.length - beforeFailures }
  }
  await cache.writeManifest(manifest)

  const normalized: ProviderAnimeRecord[] = []
  let unsupportedPlaybackUrls = 0
  for (const provider of providers) {
    for (const item of rawByProvider.get(provider.config.id) ?? []) {
      try {
        const result = normalizeProviderAnime(item, provider.config)
        normalized.push(result.record)
        unsupportedPlaybackUrls += result.unsupported
      } catch (error) {
        failures.push({ provider: provider.config.id, providerItemId: item.vod_id === undefined ? undefined : String(item.vod_id), stage: 'normalize', errorCode: 'normalize', message: safeMessage(error) })
      }
    }
  }
  const mappingKeys = normalized.map((record) => ({ provider: record.providerId, providerItemId: record.providerItemId }))
  const existingMappings = dependencies.store ? await dependencies.store.getSourceMappings(mappingKeys) : new Map<string, SourceMapping>()
  const identity = resolveCanonicalIdentity(normalized, existingMappings)
  const externalIds = [...identity.groups.keys()]
  const states = dependencies.store ? await dependencies.store.getStates(externalIds) : new Map()
  const canonicals: CanonicalAnime[] = []
  for (const [externalId, records] of identity.groups) {
    try {
      const prior = dependencies.detailStore ? await dependencies.detailStore.get(externalId) : null
      const matching = identity.mappings.find((mapping) => mapping.canonicalExternalId === externalId)
      const canonical = mergeCanonicalAnime(externalId, records, matching?.matchedBy ?? 'deterministic-new', prior ?? undefined)
      if (!canonical.detail.episodes.length) throw new Error('No directly playable HLS or MP4 episodes')
      canonicals.push(canonical)
    } catch (error) {
      failures.push({ provider: records[0].providerId, canonicalExternalId: externalId, stage: 'normalize', errorCode: 'canonical-output', message: safeMessage(error) })
    }
  }

  if (!options.dryRun && (!dependencies.store || !dependencies.detailStore)) {
    throw new Error('Live sync requires Firebase Admin and R2 write configuration')
  }
  const prepared: PreparedCanonicalWrite[] = []
  let r2Uploaded = 0
  let r2Skipped = 0
  let remainingMediaProbes = 10
  for (const canonical of canonicals) {
    const indexHash = contentHash(canonical.index)
    const detailHash = contentHash(canonical.detail)
    const previous = states.get(canonical.externalId)
    const detailChanged = previous?.detailHash !== detailHash
    const indexChanged = previous?.indexHash !== indexHash
    let r2Changed = detailChanged
    if (!detailChanged && dependencies.detailStore) r2Changed = !(await dependencies.detailStore.exists(canonical.externalId))
    if (options.probeMedia) {
      const sample = canonical.detail.episodes.flatMap((episode) => episode.sources).slice(0, Math.min(3, remainingMediaProbes))
      remainingMediaProbes -= sample.length
      for (const source of sample) {
        const result = await (dependencies.mediaProbe ?? probeMediaUrl)(source.url)
        if (!result.ok) failures.push({ provider: canonical.records[0].providerId, canonicalExternalId: canonical.externalId, stage: 'media-probe', errorCode: 'unplayable', message: result.message })
      }
    }
    if (r2Changed) {
      if (!options.dryRun) {
        try { await dependencies.detailStore!.put(canonical.detail) }
        catch (error) {
          failures.push({ provider: canonical.records[0].providerId, canonicalExternalId: canonical.externalId, stage: 'r2', errorCode: 'r2-put', message: safeMessage(error) })
          continue
        }
      }
      r2Uploaded += 1
    } else r2Skipped += 1
    prepared.push({ canonical, indexHash, detailHash, updatedAtMs: writeTimestamp(canonical, previous, indexChanged || detailChanged, started), r2Changed, indexChanged })
  }
  const successfulIds = new Set(prepared.map((write) => write.canonical.externalId))
  const successfulMappings = identity.mappings.filter((mapping) => {
    if (!successfulIds.has(mapping.canonicalExternalId)) return false
    const existing = existingMappings.get(sourceMappingId(mapping.provider, mapping.providerItemId))
    return !existing || existing.canonicalExternalId !== mapping.canonicalExternalId || existing.matchedBy !== mapping.matchedBy
  })
  const changedWrites = prepared.filter((write) => write.indexChanged || write.r2Changed)
  if (!options.dryRun && (changedWrites.length || successfulMappings.length)) await dependencies.store!.publish(changedWrites, successfulMappings)
  const summary: SyncSummary = {
    runId: id,
    mode: options.mode,
    providers: providers.map((provider) => provider.config.id),
    fetched: [...rawByProvider.values()].reduce((total, items) => total + items.length, 0),
    normalized: normalized.length,
    canonicalTitles: canonicals.length,
    mergedDuplicates: Math.max(0, normalized.length - identity.groups.size),
    r2Uploaded,
    r2Skipped,
    firestoreUpserted: prepared.filter((write) => write.indexChanged).length,
    firestoreSkipped: prepared.filter((write) => !write.indexChanged).length,
    providerFailures: new Set([...probes.filter((probe) => !probe.reachable).map((probe) => probe.providerId), ...failures.filter((failure) => failure.stage === 'list').map((failure) => failure.provider)]).size,
    itemFailures: failures.filter((failure) => failure.stage !== 'list' && failure.stage !== 'probe').length,
    ambiguousMatches: identity.ambiguousMatches,
    unsupportedPlaybackUrls,
    elapsedMs: (dependencies.now?.() ?? Date.now()) - started,
  }
  const failureFile = await cache.writeFailures(failures)
  log(`Failure report: ${failureFile}`)
  return { summary, failures, canonicals, probes }
}
