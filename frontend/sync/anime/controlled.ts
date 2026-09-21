import { classifyAnimeContent, discoverAnimeCategoryPolicies } from './contentPolicy'
import type { AnimeSyncStore } from './firebaseAdminStore'
import { sourceMappingId } from './identity'
import { mapConcurrent } from './http'
import type { AnimeRawCache } from './rawCache'
import type {
  AnimeUpstreamProvider,
  MacCmsVodItem,
  SourceMapping,
  SyncCheckpoint,
  SyncFailure,
  SyncOperationCounts,
  SyncOptions,
  SyncStopReason,
} from './types'

export interface ControlledFetchResult {
  itemsByProvider: Map<string, MacCmsVodItem[]>
  existingMappings: Map<string, SourceMapping>
  candidatePositions: Map<string, SyncCheckpoint>
  nextCheckpoint: SyncCheckpoint
  providerRowsScanned: number
  existingCandidates: number
  pagesByProvider: Map<string, number>
  stopReason: SyncStopReason
}

function checkpoint(providerIndex: number, categoryIndex: number, page: number, offset: number, now: number, complete = false): SyncCheckpoint {
  return { version: 1, providerIndex, categoryIndex, page, offset, updatedAtMs: now, complete }
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : 'Unknown sync error'
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

export async function fetchControlledCandidates(input: {
  providers: AnimeUpstreamProvider[]
  store: AnimeSyncStore
  cache: AnimeRawCache
  options: SyncOptions
  operations: SyncOperationCounts
  failures: SyncFailure[]
  start: SyncCheckpoint
  now: number
}): Promise<ControlledFetchResult> {
  const { providers, store, cache, options, operations, failures, now } = input
  if (!options.contentGroupTargets) throw new Error('Controlled sync requires --content-groups so only approved Anime categories are traversed')
  const maxTitles = options.maxTitles ?? 100
  const readLimit = (options.maxFirestoreReads ?? 30_000) - (options.operationSafetyMargin ?? 100)
  const itemsByProvider = new Map<string, MacCmsVodItem[]>()
  const existingMappings = new Map<string, SourceMapping>()
  const candidatePositions = new Map<string, SyncCheckpoint>()
  const pagesByProvider = new Map<string, number>()
  let nextCheckpoint = { ...input.start, updatedAtMs: now }
  let providerRowsScanned = 0
  let existingCandidates = 0
  let newCandidates = 0

  for (let providerIndex = input.start.providerIndex; providerIndex < providers.length; providerIndex += 1) {
    const provider = providers[providerIndex]
    const policies = discoverAnimeCategoryPolicies(await provider.fetchCategories())
      .filter((policy) => (options.contentGroupTargets?.[policy.group] ?? 0) > 0)
    const firstCategory = providerIndex === input.start.providerIndex ? input.start.categoryIndex : 0
    for (let categoryIndex = firstCategory; categoryIndex < policies.length; categoryIndex += 1) {
      const policy = policies[categoryIndex]
      let pageNumber = providerIndex === input.start.providerIndex && categoryIndex === firstCategory ? input.start.page : 1
      let offset = providerIndex === input.start.providerIndex && categoryIndex === firstCategory ? input.start.offset : 0
      let pageCount = pageNumber
      do {
        let page
        try {
          page = await provider.fetchPage(pageNumber, undefined, policy.typeId)
          await cache.writePage(`${provider.config.id}-${policy.group}`, pageNumber, page.raw)
          pagesByProvider.set(provider.config.id, (pagesByProvider.get(provider.config.id) ?? 0) + 1)
          pageCount = page.pageCount
        } catch (error) {
          failures.push({ provider: provider.config.id, stage: 'list', errorCode: 'provider-list', message: safeMessage(error) })
          return { itemsByProvider, existingMappings, candidatePositions, nextCheckpoint, providerRowsScanned, existingCandidates, pagesByProvider, stopReason: 'error threshold' }
        }

        const remaining = page.items.slice(offset)
        const maximumLookup = Math.max(0, Math.floor((readLimit - operations.firestoreReads - newCandidates) / 2))
        const selected = remaining.slice(0, maximumLookup)
        if (!selected.length && remaining.length) {
          return { itemsByProvider, existingMappings, candidatePositions, nextCheckpoint, providerRowsScanned, existingCandidates, pagesByProvider, stopReason: 'read budget' }
        }
        const keyed = selected.flatMap((item, index) => item.vod_id === undefined || item.vod_id === null
          ? []
          : [{ item, index: offset + index, provider: provider.config.id, providerItemId: String(item.vod_id) }])
        const mappings = await store.getSourceMappings(keyed.map(({ provider: id, providerItemId }) => ({ provider: id, providerItemId })))
        operations.firestoreReads += keyed.length
        operations.sourceMapReads += keyed.length
        for (const [id, mapping] of mappings) existingMappings.set(id, mapping)

        for (const entry of keyed) {
          const before = checkpoint(providerIndex, categoryIndex, pageNumber, entry.index, now)
          const afterIndex = entry.index + 1
          nextCheckpoint = afterIndex < page.items.length
            ? checkpoint(providerIndex, categoryIndex, pageNumber, afterIndex, now)
            : pageNumber < pageCount
              ? checkpoint(providerIndex, categoryIndex, pageNumber + 1, 0, now)
              : categoryIndex + 1 < policies.length
                ? checkpoint(providerIndex, categoryIndex + 1, 1, 0, now)
                : providerIndex + 1 < providers.length
                  ? checkpoint(providerIndex + 1, 0, 1, 0, now)
                  : checkpoint(providers.length, 0, 1, 0, now, true)
          providerRowsScanned += 1
          const mappingId = sourceMappingId(entry.provider, entry.providerItemId)
          if (mappings.has(mappingId)) {
            existingCandidates += 1
            continue
          }
          const decision = classifyAnimeContent(entry.item, policies)
          if (!decision.accepted || decision.group !== policy.group) continue
          const items = itemsByProvider.get(provider.config.id) ?? []
          items.push(entry.item)
          itemsByProvider.set(provider.config.id, items)
          candidatePositions.set(mappingId, before)
          newCandidates += 1
          if (newCandidates >= maxTitles) {
            pageNumber = pageCount + 1
            break
          }
        }
        if (newCandidates >= maxTitles) break
        if (selected.length < remaining.length) {
          return { itemsByProvider, existingMappings, candidatePositions, nextCheckpoint, providerRowsScanned, existingCandidates, pagesByProvider, stopReason: 'read budget' }
        }
        pageNumber += 1
        offset = 0
      } while (pageNumber <= pageCount)
      if (newCandidates >= maxTitles) break
    }
    if (newCandidates >= maxTitles) break
  }

  const candidates = [...itemsByProvider.entries()].flatMap(([providerId, items]) => ({ providerId, items }))
  for (const { providerId, items } of candidates) {
    const provider = providers.find((candidate) => candidate.config.id === providerId)!
    const detailBatches = chunks(items, 20)
    const details = await mapConcurrent(detailBatches, Math.min(3, options.concurrency), async (batch) => {
      const ids = batch.map((item) => String(item.vod_id))
      const detail = await provider.fetchDetails(ids)
      await cache.writeDetail(provider.config.id, `batch-${ids[0]}-${ids.at(-1)}`, detail.raw)
      return detail.items
    })
    const successful: MacCmsVodItem[] = []
    for (let index = 0; index < details.length; index += 1) {
      const result = details[index]
      if (result.status === 'fulfilled') successful.push(...result.value)
      else {
        const failedBatch = detailBatches[index]
        for (const item of failedBatch) failures.push({ provider: provider.config.id, providerItemId: String(item.vod_id), stage: 'detail', errorCode: 'provider-detail', message: safeMessage(result.reason) })
        const first = failedBatch[0]
        const retry = first && candidatePositions.get(sourceMappingId(provider.config.id, String(first.vod_id)))
        if (retry) nextCheckpoint = retry
      }
    }
    itemsByProvider.set(providerId, successful)
  }

  return {
    itemsByProvider,
    existingMappings,
    candidatePositions,
    nextCheckpoint,
    providerRowsScanned,
    existingCandidates,
    pagesByProvider,
    stopReason: failures.some((failure) => failure.stage === 'detail')
      ? 'error threshold'
      : newCandidates >= maxTitles
        ? 'title cap'
        : nextCheckpoint.complete
          ? 'provider exhausted'
          : 'complete',
  }
}
