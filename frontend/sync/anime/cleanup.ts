import { mapConcurrent } from './http'
import { classifyAnimeContent, discoverAnimeCategoryPolicies, isCommentaryItem, type AnimeContentDecision } from './contentPolicy'
import { normalizeAnimeTitle } from '../../src/domain/anime'
import type { AnimeSyncStore, ExistingCatalogueRecord } from './firebaseAdminStore'
import type { AnimeDetailStore } from './r2Store'
import type { AnimeUpstreamProvider } from './types'

export interface CleanupClassification {
  externalId: string
  title: string
  action: 'keep' | 'remove'
  reason: 'accepted-anime' | 'unverified-source' | 'commentary' | 'other-non-anime' | 'duplicate-canonical'
}

export interface AnimeCleanupPlan {
  classifications: CleanupClassification[]
  removeExternalIds: string[]
  removeMappingDocumentIds: string[]
  orphanedProgressExternalIds: string[]
  total: number
  keep: number
  remove: number
  commentary: number
  otherNonAnime: number
  duplicateCanonical: number
}

export function classifyExistingCatalogue(
  records: ExistingCatalogueRecord[],
  sourceDecisions: Map<string, Array<AnimeContentDecision | null>>,
): CleanupClassification[] {
  const classifications: CleanupClassification[] = records.map((record): CleanupClassification => {
    const titleCommentary = isCommentaryItem({ vod_name: record.title })
    const decisions = sourceDecisions.get(record.externalId) ?? []
    if (decisions.some((decision) => decision === null)) return { externalId: record.externalId, title: record.title, action: 'keep', reason: 'unverified-source' }
    const accepted = decisions.some((decision) => decision?.accepted && decision.region === record.region && decision.mediaType === record.mediaType)
    if (accepted) return { externalId: record.externalId, title: record.title, action: 'keep', reason: 'accepted-anime' }
    const commentary = titleCommentary || decisions.some((decision) => decision !== null && !decision.accepted && decision.reason === 'commentary')
    return { externalId: record.externalId, title: record.title, action: 'remove', reason: commentary ? 'commentary' : 'other-non-anime' }
  })
  const acceptedByIdentity = new Map<string, CleanupClassification[]>()
  for (const classification of classifications) {
    if (classification.action !== 'keep' || classification.reason !== 'accepted-anime') continue
    const record = records.find((candidate) => candidate.externalId === classification.externalId)
    if (!record?.year || !record.mediaType || !record.region) continue
    const key = `${normalizeAnimeTitle(record.title)}|${record.year}|${record.mediaType}|${record.region}`
    acceptedByIdentity.set(key, [...(acceptedByIdentity.get(key) ?? []), classification])
  }
  for (const duplicates of acceptedByIdentity.values()) {
    if (duplicates.length < 2) continue
    const survivor = [...duplicates].sort((left, right) => left.externalId.localeCompare(right.externalId))[0]
    for (const duplicate of duplicates) {
      if (duplicate.externalId === survivor.externalId) continue
      duplicate.action = 'remove'
      duplicate.reason = 'duplicate-canonical'
    }
  }
  return classifications
}

export async function planAnimeCleanup(
  store: AnimeSyncStore,
  providers: AnimeUpstreamProvider[],
  concurrency = 3,
): Promise<AnimeCleanupPlan> {
  const [records, mappings] = await Promise.all([store.listCatalogue(), store.listAllSourceMappings()])
  const policies = new Map<string, ReturnType<typeof discoverAnimeCategoryPolicies>>()
  await Promise.all(providers.map(async (provider) => policies.set(provider.config.id, discoverAnimeCategoryPolicies(await provider.fetchCategories()))))
  const jobs = providers.flatMap((provider) => {
    const providerMappings = mappings.filter(({ mapping }) => mapping.provider === provider.config.id)
    const batches = []
    for (let index = 0; index < providerMappings.length; index += 20) batches.push({ provider, entries: providerMappings.slice(index, index + 20) })
    return batches
  })
  const results = await mapConcurrent(jobs, Math.min(3, concurrency), async ({ provider, entries }) => {
    const detail = await provider.fetchDetails(entries.map(({ mapping }) => mapping.providerItemId))
    const items = new Map(detail.items.map((item) => [String(item.vod_id), item]))
    return entries.map(({ mapping }) => ({
      canonicalExternalId: mapping.canonicalExternalId,
      decision: items.get(mapping.providerItemId)
        ? classifyAnimeContent(items.get(mapping.providerItemId)!, policies.get(mapping.provider) ?? [])
        : ({ accepted: false, reason: 'category-not-allowed' } as AnimeContentDecision),
    }))
  })
  const sourceDecisions = new Map<string, Array<AnimeContentDecision | null>>()
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      for (const { mapping } of jobs[index].entries) sourceDecisions.set(mapping.canonicalExternalId, [...(sourceDecisions.get(mapping.canonicalExternalId) ?? []), null])
      return
    }
    for (const { canonicalExternalId, decision } of result.value) {
      sourceDecisions.set(canonicalExternalId, [...(sourceDecisions.get(canonicalExternalId) ?? []), decision])
    }
  })
  const classifications = classifyExistingCatalogue(records, sourceDecisions)
  const removeExternalIds = classifications.filter((item) => item.action === 'remove').map((item) => item.externalId)
  const removeSet = new Set(removeExternalIds)
  const removeMappingDocumentIds = mappings.filter(({ mapping }) => removeSet.has(mapping.canonicalExternalId)).map(({ documentId }) => documentId)
  const orphanedProgressExternalIds = await store.findProgressExternalIds(removeExternalIds)
  return {
    classifications,
    removeExternalIds,
    removeMappingDocumentIds,
    orphanedProgressExternalIds,
    total: classifications.length,
    keep: classifications.filter((item) => item.action === 'keep').length,
    remove: removeExternalIds.length,
    commentary: classifications.filter((item) => item.reason === 'commentary').length,
    otherNonAnime: classifications.filter((item) => item.reason === 'other-non-anime').length,
    duplicateCanonical: classifications.filter((item) => item.reason === 'duplicate-canonical').length,
  }
}

export async function applyAnimeCleanup(plan: AnimeCleanupPlan, store: AnimeSyncStore, detailStore: AnimeDetailStore): Promise<void> {
  if (!plan.removeExternalIds.length) return
  await store.deleteCatalogue(plan.removeExternalIds)
  for (const externalId of plan.removeExternalIds) await detailStore.remove(externalId)
  await store.deleteInternalMetadata(plan.removeExternalIds, plan.removeMappingDocumentIds)
}
