import path from 'node:path'
import { contentHash } from './stableJson'
import { mapConcurrent } from './http'
import { resolveCanonicalIdentity, sourceMappingId } from './identity'
import { mergeCanonicalAnime } from './merge'
import { normalizeProviderAnime } from './normalize'
import { probeMediaUrl } from './mediaProbe'
import { classifyAnimeContent, discoverAnimeCategoryPolicies, type AnimeCategoryPolicy, type AnimeImportRegion } from './contentPolicy'
import { AnimeRawCache, readCachedDetails, readFailureFile, type RawRunManifest } from './rawCache'
import { fetchControlledCandidates } from './controlled'
import { defaultMaxFirestoreReads, defaultMaxFirestoreWrites, defaultOperationSafetyMargin } from './config'
import type { AnimeDetailStore } from './r2Store'
import type { AnimeSyncStore } from './firebaseAdminStore'
import type {
  AnimeProviderConfig,
  AnimeContentGroup,
  AnimeUpstreamProvider,
  CanonicalAnime,
  MacCmsVodItem,
  PreparedCanonicalWrite,
  ProviderAnimeRecord,
  SourceMapping,
  SyncFailure,
  SyncCheckpoint,
  SyncOperationCounts,
  SyncOptions,
  SyncSummary,
  SyncStopReason,
} from './types'
import type { AnimeMediaType, AnimeRegion } from '../../src/types/anime'

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
  return error instanceof Error ? safeDiagnostic(error.message) : 'Unknown sync error'
}

function safeDiagnostic(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/\b(token|api[_-]?key|secret|password|authorization)\b\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 300)
}

function runId(now: number): string {
  return new Date(now).toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function emptyOperations(): SyncOperationCounts {
  return {
    firestoreReads: 0,
    firestoreWrites: 0,
    firestoreDeletes: 0,
    sourceMapReads: 0,
    sourceMapWrites: 0,
    syncStateReads: 0,
    syncStateWrites: 0,
    checkpointReads: 0,
    checkpointWrites: 0,
    r2Reads: 0,
    r2Writes: 0,
    r2Deletes: 0,
    r2UnchangedSkipped: 0,
  }
}

function initialCheckpoint(now: number): SyncCheckpoint {
  return { version: 1, providerIndex: 0, categoryIndex: 0, page: 1, offset: 0, updatedAtMs: now, complete: false }
}

function usesContentPolicy(options: SyncOptions): boolean {
  return Boolean(options.applyContentPolicy || options.contentTargets || options.contentGroupTargets)
}

function targetForPolicy(options: SyncOptions, policy: AnimeCategoryPolicy): number {
  if (options.contentGroupTargets) return options.contentGroupTargets[policy.group]
  if (!options.contentTargets) return 0
  if (policy.group === 'china_anime') return options.contentTargets.china
  if (policy.group === 'east_asia_anime') return options.contentTargets.japan
  if (policy.group === 'western_anime') return options.contentTargets.europe_us
  return 0
}

async function fetchProvider(
  provider: AnimeUpstreamProvider,
  cache: AnimeRawCache,
  options: SyncOptions,
  failures: SyncFailure[],
  providerCount: number,
): Promise<{ items: MacCmsVodItem[]; pages: number; policies: AnimeCategoryPolicy[]; commentaryRejected: number; otherRejected: number }> {
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
    }), pages: 0, policies: [], commentaryRejected: 0, otherRejected: 0 }
  }
  if (usesContentPolicy(options)) {
    const policies = discoverAnimeCategoryPolicies(await provider.fetchCategories())
    const items: MacCmsVodItem[] = []
    let pages = 0
    let commentaryRejected = 0
    let otherRejected = 0
    for (const policy of policies) {
      const target = targetForPolicy(options, policy)
      if (!target) continue
      const providerTarget = Math.ceil((target / providerCount) * 1.25) + 2
      let pageNumber = 1
      let pageCount = 1
      const accepted = new Map<string, MacCmsVodItem>()
      do {
        try {
          const page = await provider.fetchPage(pageNumber, undefined, policy.typeId)
          await cache.writePage(`${provider.config.id}-${policy.group}`, pageNumber, page.raw)
          pages += 1
          pageCount = page.pageCount
          for (const item of page.items) {
            const decision = classifyAnimeContent(item, policies)
            if (!decision.accepted) {
              if (decision.reason === 'commentary') commentaryRejected += 1
              else otherRejected += 1
              continue
            }
            if (decision.group !== policy.group || item.vod_id === undefined || item.vod_id === null) continue
            accepted.set(String(item.vod_id), item)
            if (accepted.size >= providerTarget) break
          }
          pageNumber += 1
        } catch (error) {
          failures.push({ provider: provider.config.id, stage: 'list', errorCode: 'provider-list', message: safeMessage(error) })
          break
        }
      } while (pageNumber <= pageCount && accepted.size < providerTarget)
      items.push(...accepted.values())
    }
    const limited = options.limit ? items.slice(0, options.limit) : items
    const detailBatches = chunks(limited, 20)
    const details = await mapConcurrent(detailBatches, Math.min(3, options.concurrency), async (batch) => {
      const ids = batch.map((item) => String(item.vod_id))
      const detail = await provider.fetchDetails(ids)
      await cache.writeDetail(provider.config.id, `batch-${ids[0]}-${ids.at(-1)}`, detail.raw)
      return detail.items
    })
    const acceptedDetails: MacCmsVodItem[] = []
    for (let index = 0; index < details.length; index += 1) {
      const result = details[index]
      if (result.status === 'rejected') {
        for (const item of detailBatches[index]) failures.push({ provider: provider.config.id, providerItemId: String(item.vod_id), stage: 'detail', errorCode: 'provider-detail', message: safeMessage(result.reason) })
        continue
      }
      for (const item of result.value) {
        const decision = classifyAnimeContent(item, policies)
        if (!decision.accepted) {
          if (decision.reason === 'commentary') commentaryRejected += 1
          else otherRejected += 1
          continue
        }
        acceptedDetails.push(item)
      }
    }
    return { items: acceptedDetails, pages, policies, commentaryRejected, otherRejected }
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
  }), pages: fetchedPages, policies: [], commentaryRejected: 0, otherRejected: 0 }
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

function selectContentTargets(
  canonicals: CanonicalAnime[],
  targets: Record<AnimeImportRegion, number> | undefined,
  groupTargets: Record<AnimeContentGroup, number> | undefined,
): CanonicalAnime[] {
  if (!targets && !groupTargets) return canonicals
  const counts: Record<AnimeImportRegion, number> = { japan: 0, china: 0, europe_us: 0 }
  const groupCounts = new Map<AnimeContentGroup, number>()
  return [...canonicals]
    .sort((left, right) => (right.providerUpdatedAt ?? 0) - (left.providerUpdatedAt ?? 0) || left.externalId.localeCompare(right.externalId))
    .filter((canonical) => {
      if (groupTargets) {
        const group = canonical.records[0]?.contentGroup
        if (!group || (groupCounts.get(group) ?? 0) >= groupTargets[group]) return false
        groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1)
        return true
      }
      const region = canonical.index.region
      if (region !== 'japan' && region !== 'china' && region !== 'europe_us') return false
      if (!targets || counts[region] >= targets[region]) return false
      counts[region] += 1
      return true
    })
}

function regionCounts(canonicals: CanonicalAnime[]): Record<AnimeRegion, number> {
  const counts: Record<AnimeRegion, number> = { japan: 0, china: 0, europe_us: 0, korea: 0, hong_kong_taiwan: 0, other: 0 }
  for (const canonical of canonicals) counts[canonical.index.region ?? 'other'] += 1
  return counts
}

function mediaTypeCounts(canonicals: CanonicalAnime[]): Record<AnimeMediaType, number> {
  const counts: Record<AnimeMediaType, number> = { anime: 0, movie: 0, tv_series: 0, documentary: 0 }
  for (const canonical of canonicals) counts[canonical.index.mediaType] += 1
  return counts
}

export async function runAnimeSync(options: SyncOptions, dependencies: AnimeSyncDependencies): Promise<AnimeSyncResult> {
  const started = dependencies.now?.() ?? Date.now()
  const id = runId(started)
  const log = dependencies.log ?? (() => undefined)
  const failures: SyncFailure[] = []
  const operations = emptyOperations()
  const cache = new AnimeRawCache(dependencies.cacheRoot, id)
  const providers = selectedProviders(dependencies.providers, options.providerIds)
  if (!providers.length) throw new Error('No Anime sync providers are configured for this run')
  const probes = options.fromCache
    ? providers.map((provider) => ({ providerId: provider.config.id, reachable: true, validJson: true, hasPagination: true, hasDetail: true, hasPlayback: true, incrementalSupported: false, message: 'Replayed from raw cache without an upstream request.' }))
    : await Promise.all(providers.map((provider) => provider.probe()))
  if (options.probeOnly) {
    return {
      summary: { runId: id, mode: options.mode, providers: providers.map((provider) => provider.config.id), fetched: 0, normalized: 0, canonicalTitles: 0, mergedDuplicates: 0, r2Uploaded: 0, r2Skipped: 0, firestoreUpserted: 0, firestoreSkipped: 0, providerFailures: probes.filter((probe) => !probe.reachable).length, itemFailures: 0, ambiguousMatches: 0, unsupportedPlaybackUrls: 0, elapsedMs: (dependencies.now?.() ?? Date.now()) - started, contentAccepted: { japan: 0, china: 0, europe_us: 0, korea: 0, hong_kong_taiwan: 0, other: 0 }, mediaTypeAccepted: { anime: 0, movie: 0, tv_series: 0, documentary: 0 }, commentaryRejected: 0, otherRejected: 0, providerStats: Object.fromEntries(providers.map((provider) => [provider.config.id, provider.stats])), providerRowsScanned: 0, newCandidates: 0, existingCandidates: 0, canonicalCreated: 0, canonicalUpdated: 0, unchangedTitlesSkipped: 0, operations, plannedFirestoreWrites: 0, plannedR2Writes: 0, retryCount: providers.reduce((total, provider) => total + provider.stats.retries, 0), stopReason: 'complete' },
      failures,
      canonicals: [],
      probes,
    }
  }
  const cached = await cachedProviderRecords(options, providers.map((provider) => provider.config))
  const rawByProvider = new Map<string, MacCmsVodItem[]>()
  const policiesByProvider = new Map<string, AnimeCategoryPolicy[]>()
  let commentaryRejected = 0
  let otherRejected = 0
  const manifest: RawRunManifest = { runId: id, mode: options.mode, startedAt: new Date(started).toISOString(), providers: {} }
  let controlledMappings = new Map<string, SourceMapping>()
  let controlledCandidatePositions = new Map<string, SyncCheckpoint>()
  let controlledCheckpoint: SyncCheckpoint | undefined
  let controlledStartCheckpoint: SyncCheckpoint | undefined
  let providerRowsScanned = 0
  let existingCandidates = 0
  let stopReason: SyncStopReason = 'complete'
  if (options.controlled) {
    if (!dependencies.store?.getCheckpoint || !dependencies.store.saveCheckpoint) throw new Error('Controlled sync requires a checkpoint-capable Firebase store')
    const checkpointId = options.checkpointId ?? 'controlled-v1'
    const saved = await dependencies.store.getCheckpoint(checkpointId)
    controlledStartCheckpoint = saved ?? initialCheckpoint(started)
    operations.firestoreReads += 1
    operations.checkpointReads += 1
    const controlled = await fetchControlledCandidates({
      providers,
      store: dependencies.store,
      cache,
      options,
      operations,
      failures,
      start: controlledStartCheckpoint,
      now: started,
    })
    controlledMappings = controlled.existingMappings
    controlledCandidatePositions = controlled.candidatePositions
    controlledCheckpoint = controlled.nextCheckpoint
    providerRowsScanned = controlled.providerRowsScanned
    existingCandidates = controlled.existingCandidates
    stopReason = controlled.stopReason
    for (const provider of providers) {
      const items = controlled.itemsByProvider.get(provider.config.id) ?? []
      rawByProvider.set(provider.config.id, items)
      policiesByProvider.set(provider.config.id, discoverAnimeCategoryPolicies(await provider.fetchCategories()))
      manifest.providers[provider.config.id] = { pages: controlled.pagesByProvider.get(provider.config.id) ?? 0, itemCount: items.length, failures: failures.filter((failure) => failure.provider === provider.config.id).length }
    }
  } else for (const provider of providers) {
    const beforeFailures = failures.length
    const cachedItems = cached.get(provider.config.id) ?? []
    const cachedPolicies = usesContentPolicy(options) ? discoverAnimeCategoryPolicies(cachedItems.flatMap((item) => item.type_id === undefined || item.type_id === null || !item.type_name ? [] : [{ id: String(item.type_id), name: String(item.type_name) }])) : []
    const fetched = options.fromCache
      ? { items: cachedItems, pages: 0, policies: cachedPolicies, commentaryRejected: 0, otherRejected: 0 }
      : await fetchProvider(provider, cache, options, failures, providers.length)
    rawByProvider.set(provider.config.id, fetched.items)
    policiesByProvider.set(provider.config.id, fetched.policies)
    commentaryRejected += fetched.commentaryRejected
    otherRejected += fetched.otherRejected
    manifest.providers[provider.config.id] = { pages: fetched.pages, itemCount: fetched.items.length, failures: failures.length - beforeFailures }
  }
  await cache.writeManifest(manifest)

  const normalized: ProviderAnimeRecord[] = []
  let unsupportedPlaybackUrls = 0
  for (const provider of providers) {
    for (const item of rawByProvider.get(provider.config.id) ?? []) {
      try {
        const decision = usesContentPolicy(options) ? classifyAnimeContent(item, policiesByProvider.get(provider.config.id) ?? []) : null
        if (decision && !decision.accepted) {
          if (decision.reason === 'commentary') commentaryRejected += 1
          else otherRejected += 1
          continue
        }
        const result = normalizeProviderAnime(item, provider.config, decision?.accepted ? {
          mediaType: decision.mediaType,
          region: decision.region,
          contentGroup: decision.group,
          requiredGenres: decision.requiredGenres,
        } : {})
        normalized.push(result.record)
        unsupportedPlaybackUrls += result.unsupported
      } catch (error) {
        failures.push({ provider: provider.config.id, providerItemId: item.vod_id === undefined ? undefined : String(item.vod_id), stage: 'normalize', errorCode: 'normalize', message: safeMessage(error) })
      }
    }
  }
  const readLimit = (options.maxFirestoreReads ?? defaultMaxFirestoreReads) - (options.operationSafetyMargin ?? defaultOperationSafetyMargin)
  const maximumIdentityInputs = !options.controlled && dependencies.store
    ? Math.max(0, Math.floor((readLimit - operations.firestoreReads) / 2))
    : normalized.length
  const identityInput = normalized.slice(0, maximumIdentityInputs)
  if (identityInput.length < normalized.length) stopReason = 'read budget'
  const mappingKeys = identityInput.map((record) => ({ provider: record.providerId, providerItemId: record.providerItemId }))
  const existingMappings = options.controlled
    ? controlledMappings
    : dependencies.store ? await dependencies.store.getSourceMappings(mappingKeys) : new Map<string, SourceMapping>()
  if (!options.controlled && dependencies.store) {
    operations.firestoreReads += mappingKeys.length
    operations.sourceMapReads += mappingKeys.length
    existingCandidates = mappingKeys.filter((key) => existingMappings.has(sourceMappingId(key.provider, key.providerItemId))).length
  }
  const identity = resolveCanonicalIdentity(identityInput, existingMappings)
  for (const ambiguity of identity.ambiguities) {
    const position = controlledCandidatePositions.get(sourceMappingId(ambiguity.provider, ambiguity.providerItemId))
    log(`Ambiguous match: ${JSON.stringify({
      provider: safeDiagnostic(ambiguity.provider),
      providerItemId: safeDiagnostic(ambiguity.providerItemId),
      title: safeDiagnostic(ambiguity.title),
      candidateCanonicalIds: ambiguity.candidateCanonicalIds,
      assignedCanonicalId: ambiguity.assignedCanonicalId,
      ...(position ? { cursor: { providerIndex: position.providerIndex, categoryIndex: position.categoryIndex, page: position.page, offset: position.offset } } : {}),
    })}`)
  }
  const availableStateReads = Math.max(0, readLimit - operations.firestoreReads)
  const identityGroups = [...identity.groups.entries()]
  const selectedGroups = identityGroups.slice(0, availableStateReads)
  if (selectedGroups.length < identityGroups.length) stopReason = 'read budget'
  const externalIds = selectedGroups.map(([externalId]) => externalId)
  const states = dependencies.store ? await dependencies.store.getStates(externalIds) : new Map()
  if (dependencies.store) {
    operations.firestoreReads += externalIds.length
    operations.syncStateReads += externalIds.length
  }
  const mergedCanonicals: CanonicalAnime[] = []
  const mergeJobs = selectedGroups
  const mergeResults = await mapConcurrent(mergeJobs, Math.min(3, options.concurrency), async ([externalId, records]) => {
    const prior = dependencies.detailStore && states.has(externalId) ? await dependencies.detailStore.get(externalId) : null
    if (dependencies.detailStore && states.has(externalId)) operations.r2Reads += 1
    const matching = identity.mappings.find((mapping) => mapping.canonicalExternalId === externalId)
    return mergeCanonicalAnime(externalId, records, matching?.matchedBy ?? 'deterministic-new', prior ?? undefined)
  })
  for (let index = 0; index < mergeResults.length; index += 1) {
    const result = mergeResults[index]
    if (result.status === 'fulfilled') mergedCanonicals.push(result.value)
    else {
      const [externalId, records] = mergeJobs[index]
      const sources = records.map((record) => {
        const position = controlledCandidatePositions.get(sourceMappingId(record.providerId, record.providerItemId))
        return {
          provider: safeDiagnostic(record.providerId),
          providerItemId: safeDiagnostic(record.providerItemId),
          title: safeDiagnostic(record.title),
          ...(position ? { cursor: { providerIndex: position.providerIndex, categoryIndex: position.categoryIndex, page: position.page, offset: position.offset } } : {}),
        }
      })
      const failure: SyncFailure = {
        provider: sources[0].provider,
        providerItemId: sources[0].providerItemId,
        canonicalExternalId: externalId,
        sources,
        stage: 'normalize',
        errorCode: 'canonical-output',
        message: safeMessage(result.reason),
        ...(result.reason instanceof Error ? { errorName: safeDiagnostic(result.reason.name) } : {}),
      }
      failures.push(failure)
      log(`Canonical-output failure: ${JSON.stringify(failure)}`)
    }
  }
  const canonicals = options.controlled
    ? mergedCanonicals
    : selectContentTargets(mergedCanonicals, options.contentTargets, options.contentGroupTargets)

  if (!options.dryRun && (!dependencies.store || !dependencies.detailStore)) {
    throw new Error('Live sync requires Firebase Admin and R2 write configuration')
  }
  const prepared: PreparedCanonicalWrite[] = []
  let r2Uploaded = 0
  let r2Skipped = 0
  let remainingMediaProbes = 10
  const preparationResults = await mapConcurrent(canonicals, Math.min(3, options.concurrency), async (canonical) => {
    const indexHash = contentHash(canonical.index)
    const detailHash = contentHash(canonical.detail)
    const previous = states.get(canonical.externalId)
    const detailChanged = previous?.detailHash !== detailHash
    const indexChanged = previous?.indexHash !== indexHash
    const r2Changed = detailChanged
    if (options.probeMedia) {
      const sample = canonical.detail.episodes.flatMap((episode) => episode.sources).slice(0, Math.min(3, remainingMediaProbes))
      remainingMediaProbes -= sample.length
      for (const source of sample) {
        const result = await (dependencies.mediaProbe ?? probeMediaUrl)(source.url)
        if (!result.ok) failures.push({ provider: canonical.records[0].providerId, canonicalExternalId: canonical.externalId, stage: 'media-probe', errorCode: 'unplayable', message: result.message })
      }
    }
    return {
      write: { canonical, indexHash, detailHash, updatedAtMs: writeTimestamp(canonical, previous, indexChanged || detailChanged, started), r2Changed, indexChanged },
      r2Changed,
    }
  })
  for (let index = 0; index < preparationResults.length; index += 1) {
    const result = preparationResults[index]
    if (result.status === 'fulfilled') {
      prepared.push(result.value.write)
      if (result.value.r2Changed) r2Uploaded += 1
      else r2Skipped += 1
    } else {
      const canonical = canonicals[index]
      const message = safeMessage(result.reason)
      failures.push({
        provider: canonical.records[0].providerId,
        canonicalExternalId: canonical.externalId,
        stage: 'r2',
        errorCode: 'r2-prepare',
        message,
      })
    }
  }
  const successfulIds = new Set(prepared.map((write) => write.canonical.externalId))
  const successfulMappings = identity.mappings.filter((mapping) => {
    if (!successfulIds.has(mapping.canonicalExternalId)) return false
    const existing = existingMappings.get(sourceMappingId(mapping.provider, mapping.providerItemId))
    return !existing || existing.canonicalExternalId !== mapping.canonicalExternalId || existing.matchedBy !== mapping.matchedBy
  })
  const maxWrites = options.maxFirestoreWrites ?? defaultMaxFirestoreWrites
  const writeLimit = maxWrites - (options.operationSafetyMargin ?? defaultOperationSafetyMargin)
  const mappingsByCanonical = new Map<string, SourceMapping[]>()
  for (const mapping of successfulMappings) mappingsByCanonical.set(mapping.canonicalExternalId, [...(mappingsByCanonical.get(mapping.canonicalExternalId) ?? []), mapping])
  const selectedWrites: PreparedCanonicalWrite[] = []
  const selectedMappings: SourceMapping[] = []
  let plannedFirestoreWrites = 0
  for (const write of prepared) {
    const mappings = mappingsByCanonical.get(write.canonical.externalId) ?? []
    const cost = (write.indexChanged || write.r2Changed ? 2 : 0) + mappings.length
    if (operations.firestoreWrites + plannedFirestoreWrites + cost > writeLimit) {
      stopReason = 'write budget'
      if (options.controlled) {
        const position = write.canonical.records
          .map((record) => controlledCandidatePositions.get(sourceMappingId(record.providerId, record.providerItemId)))
          .find((candidate): candidate is SyncCheckpoint => Boolean(candidate))
        if (position) controlledCheckpoint = position
      }
      break
    }
    selectedWrites.push(write)
    selectedMappings.push(...mappings)
    plannedFirestoreWrites += cost
  }
  const changedWrites = selectedWrites.filter((write) => write.indexChanged || write.r2Changed)
  const plannedR2Writes = changedWrites.filter((write) => write.r2Changed).length
  const successfulR2Writes: PreparedCanonicalWrite[] = []
  for (const write of changedWrites) {
    if (!write.r2Changed || options.dryRun) {
      successfulR2Writes.push(write)
      continue
    }
    try {
      await dependencies.detailStore!.put(write.canonical.detail)
      operations.r2Writes += 1
      successfulR2Writes.push(write)
    } catch (error) {
      failures.push({ provider: write.canonical.records[0].providerId, canonicalExternalId: write.canonical.externalId, stage: 'r2', errorCode: 'r2-put', message: safeMessage(error) })
      if (options.controlled) {
        const position = write.canonical.records
          .map((record) => controlledCandidatePositions.get(sourceMappingId(record.providerId, record.providerItemId)))
          .find((candidate): candidate is SyncCheckpoint => Boolean(candidate))
        if (position) controlledCheckpoint = position
      }
      stopReason = 'error threshold'
      break
    }
  }
  const publishedIds = new Set(successfulR2Writes.map((write) => write.canonical.externalId))
  const publishMappings = selectedMappings.filter((mapping) => publishedIds.has(mapping.canonicalExternalId) || !changedWrites.some((write) => write.canonical.externalId === mapping.canonicalExternalId))
  if (!options.dryRun && (successfulR2Writes.length || publishMappings.length)) {
    await dependencies.store!.publish(successfulR2Writes, publishMappings)
    const catalogueAndStateWrites = successfulR2Writes.length * 2
    operations.firestoreWrites += catalogueAndStateWrites + publishMappings.length
    operations.syncStateWrites += successfulR2Writes.length
    operations.sourceMapWrites += publishMappings.length
  }
  if (options.controlled && failures.length && controlledStartCheckpoint) {
    controlledCheckpoint = controlledStartCheckpoint
    stopReason = 'error threshold'
    log(`Checkpoint retained due to ${failures.length} unresolved failure(s)`)
  }
  if (options.controlled && controlledCheckpoint && !options.dryRun && !failures.length) {
    await dependencies.store!.saveCheckpoint!(options.checkpointId ?? 'controlled-v1', { ...controlledCheckpoint, updatedAtMs: dependencies.now?.() ?? Date.now() })
    operations.firestoreWrites += 1
    operations.checkpointWrites += 1
  }
  r2Uploaded = options.dryRun ? plannedR2Writes : operations.r2Writes
  r2Skipped = selectedWrites.length - plannedR2Writes
  operations.r2UnchangedSkipped += r2Skipped
  const committedIds = options.dryRun
    ? new Set(selectedWrites.map((write) => write.canonical.externalId))
    : new Set([...successfulR2Writes.map((write) => write.canonical.externalId), ...publishMappings.map((mapping) => mapping.canonicalExternalId)])
  const committedWrites = selectedWrites.filter((write) => committedIds.has(write.canonical.externalId))
  const canonicalCreated = committedWrites.filter((write) => !states.has(write.canonical.externalId)).length
  const canonicalUpdated = committedWrites.filter((write) => states.has(write.canonical.externalId) && (write.indexChanged || write.r2Changed)).length
  const unchangedTitlesSkipped = committedWrites.filter((write) => !(write.indexChanged || write.r2Changed)).length
  const summary: SyncSummary = {
    runId: id,
    mode: options.mode,
    providers: providers.map((provider) => provider.config.id),
    fetched: [...rawByProvider.values()].reduce((total, items) => total + items.length, 0),
    normalized: normalized.length,
    canonicalTitles: canonicals.length,
    mergedDuplicates: Math.max(0, identityInput.length - identity.groups.size),
    r2Uploaded,
    r2Skipped,
    firestoreUpserted: options.dryRun ? changedWrites.length : successfulR2Writes.length,
    firestoreSkipped: prepared.length - changedWrites.length,
    providerFailures: new Set([...probes.filter((probe) => !probe.reachable).map((probe) => probe.providerId), ...failures.filter((failure) => failure.stage === 'list').map((failure) => failure.provider)]).size,
    itemFailures: failures.filter((failure) => failure.stage !== 'list' && failure.stage !== 'probe').length,
    ambiguousMatches: identity.ambiguousMatches,
    unsupportedPlaybackUrls,
    elapsedMs: (dependencies.now?.() ?? Date.now()) - started,
    contentAccepted: regionCounts(canonicals),
    mediaTypeAccepted: mediaTypeCounts(canonicals),
    commentaryRejected,
    otherRejected,
    providerStats: Object.fromEntries(providers.map((provider) => [provider.config.id, { ...provider.stats }])),
    providerRowsScanned: options.controlled ? providerRowsScanned : [...rawByProvider.values()].reduce((total, items) => total + items.length, 0),
    newCandidates: identityInput.length,
    existingCandidates,
    canonicalCreated,
    canonicalUpdated,
    unchangedTitlesSkipped,
    operations,
    plannedFirestoreWrites,
    plannedR2Writes,
    retryCount: providers.reduce((total, provider) => total + provider.stats.retries, 0),
    stopReason,
    ...(controlledCheckpoint ? { checkpoint: controlledCheckpoint } : {}),
  }
  const failureFile = await cache.writeFailures(failures)
  log(`Failure report: ${failureFile}`)
  return { summary, failures, canonicals, probes }
}
