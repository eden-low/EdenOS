import { classifyAnimeContent, discoverAnimeCategoryPolicies } from './contentPolicy'
import type { AnimeSyncStore } from './firebaseAdminStore'
import { sourceMappingId } from './identity'
import { mapConcurrent } from './http'
import type { AnimeRawCache } from './rawCache'
import type {
  AnimeUpstreamProvider,
  IncrementalCategoryScan,
  IncrementalCategoryState,
  IncrementalSyncState,
  MacCmsVodItem,
  SourceMapping,
  SyncCheckpoint,
  SyncFailure,
  SyncOperationCounts,
  SyncOptions,
  SyncStopReason,
} from './types'

export interface IncrementalFetchResult {
  itemsByProvider: Map<string, MacCmsVodItem[]>
  existingMappings: Map<string, SourceMapping>
  candidatePositions: Map<string, SyncCheckpoint>
  nextState: IncrementalSyncState
  providerRowsScanned: number
  existingCandidates: number
  knownRowsSkipped: number
  pagesByProvider: Map<string, number>
  categories: IncrementalCategoryScan[]
  stopReason: SyncStopReason
  safeToAdvance: boolean
}

export function incrementalCategoryKey(provider: string, categoryId: string): string {
  return `${encodeURIComponent(provider)}:${encodeURIComponent(categoryId)}`
}

export function emptyIncrementalState(now: number): IncrementalSyncState {
  return { version: 1, updatedAtMs: now, categories: {} }
}

function providerTime(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 10_000_000_000 ? value : value * 1000
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : null
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : 'Unknown sync error'
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function position(providerIndex: number, categoryIndex: number, page: number, offset: number, now: number): SyncCheckpoint {
  return { version: 1, providerIndex, categoryIndex, page, offset, updatedAtMs: now, complete: false }
}

function proposedCategoryState(
  provider: string,
  categoryId: string,
  contentGroup: IncrementalCategoryState['contentGroup'],
  current: IncrementalCategoryState | undefined,
  observed: Array<{ id: string; updatedAtMs: number | null }>,
): IncrementalCategoryState | undefined {
  const maximumObserved = observed.reduce((maximum, item) => item.updatedAtMs === null ? maximum : Math.max(maximum, item.updatedAtMs), 0)
  const watermarkUpdatedAtMs = Math.max(current?.watermarkUpdatedAtMs ?? 0, maximumObserved)
  if (!watermarkUpdatedAtMs) return current
  const observedAtWatermark = observed.filter((item) => item.updatedAtMs === watermarkUpdatedAtMs).map((item) => item.id)
  const previousAtWatermark = current?.watermarkUpdatedAtMs === watermarkUpdatedAtMs ? current.watermarkProviderItemIds : []
  return {
    provider,
    categoryId,
    contentGroup,
    watermarkUpdatedAtMs,
    watermarkProviderItemIds: [...new Set([...previousAtWatermark, ...observedAtWatermark])].sort(),
  }
}

export async function fetchIncrementalCandidates(input: {
  providers: AnimeUpstreamProvider[]
  store: AnimeSyncStore
  cache: AnimeRawCache
  options: SyncOptions
  operations: SyncOperationCounts
  failures: SyncFailure[]
  start: IncrementalSyncState
  now: number
}): Promise<IncrementalFetchResult> {
  const { providers, store, cache, options, operations, failures, now } = input
  if (!options.contentGroupTargets) throw new Error('Controlled incremental sync requires --content-groups')
  const maxPages = options.incrementalMaxPages ?? 5
  const requiredKnownPages = options.incrementalKnownPages ?? 2
  const maxTitles = options.maxTitles ?? Number.POSITIVE_INFINITY
  const readLimit = (options.maxFirestoreReads ?? 10_000) - (options.operationSafetyMargin ?? 100)
  const itemsByProvider = new Map<string, MacCmsVodItem[]>()
  const existingMappings = new Map<string, SourceMapping>()
  const candidatePositions = new Map<string, SyncCheckpoint>()
  const pagesByProvider = new Map<string, number>()
  const categories: IncrementalCategoryScan[] = []
  const nextState: IncrementalSyncState = { version: 1, updatedAtMs: now, categories: { ...input.start.categories } }
  let providerRowsScanned = 0
  let existingCandidates = 0
  let knownRowsSkipped = 0
  let candidateCount = 0
  let safeToAdvance = true
  let stopReason: SyncStopReason = 'incremental caught up'

  scan: for (let providerIndex = 0; providerIndex < providers.length; providerIndex += 1) {
    const provider = providers[providerIndex]
    const policies = discoverAnimeCategoryPolicies(await provider.fetchCategories())
      .filter((policy) => (options.contentGroupTargets?.[policy.group] ?? 0) > 0)
    for (let categoryIndex = 0; categoryIndex < policies.length; categoryIndex += 1) {
      const policy = policies[categoryIndex]
      const key = incrementalCategoryKey(provider.config.id, policy.typeId)
      const current = input.start.categories[key]
      const watermarkIds = new Set(current?.watermarkProviderItemIds ?? [])
      const observed: Array<{ id: string; updatedAtMs: number | null }> = []
      let consecutiveKnownPages = 0
      let previousPageOldest: number | null = null
      let categoryStop: IncrementalCategoryScan['stopReason'] = 'scan window'
      let pagesScanned = 0
      let rowsScanned = 0
      let categoryKnownSkipped = 0
      let categoryCandidates = 0
      let pageCount = maxPages

      for (let pageNumber = 1; pageNumber <= Math.min(pageCount, maxPages); pageNumber += 1) {
        let page
        try {
          page = await provider.fetchPage(pageNumber, undefined, policy.typeId)
          await cache.writePage(`incremental-${provider.config.id}-${policy.group}`, pageNumber, page.raw)
        } catch (error) {
          failures.push({ provider: provider.config.id, stage: 'list', errorCode: 'provider-list', message: safeMessage(error) })
          categoryStop = 'error'
          safeToAdvance = false
          stopReason = 'error threshold'
          break scan
        }
        pageCount = page.pageCount
        pagesScanned += 1
        pagesByProvider.set(provider.config.id, (pagesByProvider.get(provider.config.id) ?? 0) + 1)
        const keyed = page.items.flatMap((item, offset) => item.vod_id === undefined || item.vod_id === null
          ? []
          : [{ item, offset, providerItemId: String(item.vod_id), updatedAtMs: providerTime(item.vod_time) }])
        if (keyed.length !== page.items.length) {
          failures.push({ provider: provider.config.id, stage: 'normalize', errorCode: 'incremental-missing-id', message: `Incremental page ${pageNumber} contains a row without vod_id` })
          categoryStop = 'error'
          safeToAdvance = false
          stopReason = 'error threshold'
          break scan
        }
        const pageTimes = keyed.flatMap((entry) => entry.updatedAtMs === null ? [] : [entry.updatedAtMs])
        const pageOrdered = pageTimes.every((value, index) => index === 0 || pageTimes[index - 1] >= value)
        const pageNewest = pageTimes[0] ?? null
        if (!pageOrdered || (previousPageOldest !== null && pageNewest !== null && previousPageOldest < pageNewest)) {
          failures.push({ provider: provider.config.id, stage: 'list', errorCode: 'incremental-ordering', message: `Newest-first ordering changed for category ${policy.typeId} at page ${pageNumber}` })
          categoryStop = 'error'
          safeToAdvance = false
          stopReason = 'error threshold'
          break scan
        }
        previousPageOldest = pageTimes.at(-1) ?? previousPageOldest
        if (operations.firestoreReads + keyed.length > readLimit) {
          categoryStop = 'read budget'
          safeToAdvance = false
          stopReason = 'read budget'
          break scan
        }
        const mappings = await store.getSourceMappings(keyed.map((entry) => ({ provider: provider.config.id, providerItemId: entry.providerItemId })))
        operations.firestoreReads += keyed.length
        operations.sourceMapReads += keyed.length
        rowsScanned += keyed.length
        providerRowsScanned += keyed.length
        let pageCovered = true
        let pageHasRecent = false
        for (const entry of keyed) {
          observed.push({ id: entry.providerItemId, updatedAtMs: entry.updatedAtMs })
          const mappingId = sourceMappingId(provider.config.id, entry.providerItemId)
          const mapping = mappings.get(mappingId)
          if (mapping) {
            existingMappings.set(mappingId, mapping)
            existingCandidates += 1
          }
          const decision = classifyAnimeContent(entry.item, policies)
          if (!decision.accepted || decision.group !== policy.group) continue
          const recent = Boolean(current && entry.updatedAtMs !== null && (
            entry.updatedAtMs > current.watermarkUpdatedAtMs ||
            (entry.updatedAtMs === current.watermarkUpdatedAtMs && !watermarkIds.has(entry.providerItemId))
          ))
          if (recent) pageHasRecent = true
          if (!mapping || recent) {
            pageCovered = false
            const items = itemsByProvider.get(provider.config.id) ?? []
            items.push(entry.item)
            itemsByProvider.set(provider.config.id, items)
            candidatePositions.set(mappingId, position(providerIndex, categoryIndex, pageNumber, entry.offset, now))
            categoryCandidates += 1
            candidateCount += 1
            if (candidateCount >= maxTitles) {
              categoryStop = 'title cap'
              safeToAdvance = false
              stopReason = 'title cap'
              break scan
            }
          } else {
            knownRowsSkipped += 1
            categoryKnownSkipped += 1
          }
        }
        consecutiveKnownPages = pageCovered && !pageHasRecent ? consecutiveKnownPages + 1 : 0
        if (consecutiveKnownPages >= requiredKnownPages) {
          categoryStop = 'known boundary'
          break
        }
        if (pageNumber >= pageCount) {
          categoryStop = 'provider exhausted'
          break
        }
        if (pageNumber === maxPages) {
          categoryStop = 'scan window'
          safeToAdvance = false
          stopReason = 'scan window'
        }
      }
      const proposed = proposedCategoryState(provider.config.id, policy.typeId, policy.group, current, observed)
      if (proposed) nextState.categories[key] = proposed
      categories.push({
        provider: provider.config.id,
        categoryId: policy.typeId,
        contentGroup: policy.group,
        pagesScanned,
        rowsScanned,
        knownRowsSkipped: categoryKnownSkipped,
        candidates: categoryCandidates,
        stopReason: categoryStop,
      })
    }
  }

  const candidates = [...itemsByProvider.entries()].flatMap(([providerId, items]) => ({ providerId, items }))
  for (const { providerId, items } of candidates) {
    const provider = providers.find((candidate) => candidate.config.id === providerId)!
    const detailBatches = chunks(items, 20)
    const details = await mapConcurrent(detailBatches, Math.min(3, options.concurrency), async (batch) => {
      const ids = batch.map((item) => String(item.vod_id))
      const detail = await provider.fetchDetails(ids)
      await cache.writeDetail(provider.config.id, `incremental-batch-${ids[0]}-${ids.at(-1)}`, detail.raw)
      return detail.items
    })
    const successful: MacCmsVodItem[] = []
    for (let index = 0; index < details.length; index += 1) {
      const result = details[index]
      if (result.status === 'fulfilled') successful.push(...result.value)
      else {
        safeToAdvance = false
        stopReason = 'error threshold'
        for (const item of detailBatches[index]) failures.push({ provider: provider.config.id, providerItemId: String(item.vod_id), stage: 'detail', errorCode: 'provider-detail', message: safeMessage(result.reason) })
      }
    }
    itemsByProvider.set(providerId, successful)
  }

  return {
    itemsByProvider,
    existingMappings,
    candidatePositions,
    nextState,
    providerRowsScanned,
    existingCandidates,
    knownRowsSkipped,
    pagesByProvider,
    categories,
    stopReason,
    safeToAdvance,
  }
}
