import type { AnimeDetail, AnimeMediaType, AnimeRegion, AnimeStatus, AnimeSummary } from '../../src/types/anime'

export type AnimeSyncMode = 'full' | 'incremental'
export type PlaybackFormat = 'hls' | 'mp4'
export type AnimeContentGroup = 'china_anime' | 'east_asia_anime' | 'western_anime' | 'hong_kong_taiwan_anime' | 'overseas_anime' | 'animation_movie'

export interface AnimeProviderConfig {
  id: string
  displayName: string
  baseUrl: URL
  priority: number
  timeoutMs: number
  maxRetries: number
}

export interface ProviderProbeResult {
  providerId: string
  reachable: boolean
  validJson: boolean
  hasPagination: boolean
  hasDetail: boolean
  hasPlayback: boolean
  incrementalSupported: boolean
  catalogueTotal?: number
  pageCount?: number
  pageSize?: number
  message: string
}

export interface ProviderCategory {
  id: string
  parentId?: string
  name: string
}

export interface ProviderRuntimeStats {
  requests: number
  retries: number
  failures: number
}

export interface ProviderPage {
  page: number
  pageCount: number
  limit: number
  total: number
  items: MacCmsVodItem[]
  raw: unknown
}

export interface ProviderDetail {
  item: MacCmsVodItem
  raw: unknown
}

export interface ProviderDetailBatch {
  items: MacCmsVodItem[]
  raw: unknown
}

export interface AnimeUpstreamProvider {
  readonly config: AnimeProviderConfig
  readonly stats: ProviderRuntimeStats
  probe(): Promise<ProviderProbeResult>
  fetchCategories(): Promise<ProviderCategory[]>
  fetchPage(page: number, search?: string, categoryId?: string): Promise<ProviderPage>
  fetchDetail(providerItemId: string): Promise<ProviderDetail>
  fetchDetails(providerItemIds: string[]): Promise<ProviderDetailBatch>
}

export interface MacCmsVodItem {
  vod_id?: string | number | null
  vod_name?: string | null
  vod_pic?: string | null
  vod_year?: string | number | null
  vod_area?: string | null
  vod_class?: string | null
  vod_remarks?: string | null
  vod_content?: string | null
  vod_time?: string | number | null
  vod_score?: string | number | null
  vod_play_from?: string | null
  vod_play_url?: string | null
  type_id?: string | number | null
  type_name?: string | null
  vod_en?: string | null
  vod_sub?: string | null
  anilist_id?: string | number | null
  bangumi_id?: string | number | null
  imdb_id?: string | null
  tmdb_id?: string | number | null
}

export interface ProviderEpisodeSource {
  episodeNumber: number | null
  episodeTitle: string
  groupLabel: string
  url: string
  format: PlaybackFormat
}

export interface ProviderAnimeRecord {
  providerId: string
  providerDisplayName: string
  providerPriority: number
  providerItemId: string
  contentGroup?: AnimeContentGroup
  title: string
  titleNormalized: string
  alternateTitles: string[]
  sharedExternalIds: string[]
  coverUrl: string
  score?: number
  mediaType: AnimeMediaType
  region?: AnimeRegion
  genres: string[]
  status: AnimeStatus
  year?: number
  totalEpisodes?: number
  description?: string
  providerUpdatedAt?: number
  sources: ProviderEpisodeSource[]
}

export type CanonicalIndexContent = Omit<AnimeSummary, 'updatedAt'>

export interface CanonicalAnime {
  externalId: string
  records: ProviderAnimeRecord[]
  index: CanonicalIndexContent
  detail: AnimeDetail
  providerUpdatedAt?: number
  matchedBy: SourceMatchReason
}

export type SourceMatchReason = 'shared-id' | 'source-map' | 'exact-title' | 'deterministic-new'

export interface SourceMapping {
  provider: string
  providerItemId: string
  canonicalExternalId: string
  matchedBy: SourceMatchReason
}

export interface SyncState {
  externalId: string
  indexHash: string
  detailHash: string
  updatedAtMs: number
}

export interface SyncFailure {
  provider: string
  providerItemId?: string
  canonicalExternalId?: string
  sources?: Array<{
    provider: string
    providerItemId: string
    title: string
    cursor?: Pick<SyncCheckpoint, 'providerIndex' | 'categoryIndex' | 'page' | 'offset'>
  }>
  stage: 'probe' | 'list' | 'detail' | 'normalize' | 'identity' | 'r2' | 'firestore' | 'media-probe'
  errorCode: string
  message: string
  errorName?: string
}

export interface SyncOptions {
  mode: AnimeSyncMode
  dryRun: boolean
  providerIds?: string[]
  limit?: number
  fromCache?: string
  retryFailed?: string
  probeOnly: boolean
  probeMedia: boolean
  concurrency: number
  contentTargets?: Record<'japan' | 'china' | 'europe_us', number>
  contentGroupTargets?: Record<AnimeContentGroup, number>
  /** Preserve approved-category normalization during an exact raw-cache replay without reapplying title caps. */
  applyContentPolicy?: boolean
  cleanup: 'none' | 'plan' | 'apply'
  controlled?: boolean
  maxTitles?: number
  maxFirestoreReads?: number
  maxFirestoreWrites?: number
  operationSafetyMargin?: number
  checkpointId?: string
  incrementalStateId?: string
  incrementalMaxPages?: number
  incrementalKnownPages?: number
  catalogueStats?: boolean
  verifyIdempotency?: boolean
}

export type SyncStopReason = 'write budget' | 'read budget' | 'title cap' | 'provider exhausted' | 'incremental caught up' | 'scan window' | 'error threshold' | 'complete'

export interface SyncCheckpoint {
  version: 1
  providerIndex: number
  categoryIndex: number
  page: number
  offset: number
  updatedAtMs: number
  complete: boolean
}

export interface IncrementalCategoryState {
  provider: string
  categoryId: string
  contentGroup: AnimeContentGroup
  watermarkUpdatedAtMs: number
  watermarkProviderItemIds: string[]
}

export interface IncrementalSyncState {
  version: 1
  updatedAtMs: number
  categories: Record<string, IncrementalCategoryState>
}

export interface IncrementalCategoryScan {
  provider: string
  categoryId: string
  contentGroup: AnimeContentGroup
  pagesScanned: number
  rowsScanned: number
  knownRowsSkipped: number
  candidates: number
  stopReason: 'known boundary' | 'provider exhausted' | 'scan window' | 'read budget' | 'title cap' | 'error'
}

export interface SyncOperationCounts {
  firestoreReads: number
  firestoreWrites: number
  firestoreDeletes: number
  sourceMapReads: number
  sourceMapWrites: number
  syncStateReads: number
  syncStateWrites: number
  checkpointReads: number
  checkpointWrites: number
  incrementalStateReads: number
  incrementalStateWrites: number
  r2Reads: number
  r2Writes: number
  r2Deletes: number
  r2UnchangedSkipped: number
}

export interface CatalogueStorageMetrics {
  count: number
  sampleCount: number
  averageDocumentBytes: number
  minimumDocumentBytes: number
  maximumDocumentBytes: number
}

export interface SyncSummary {
  runId: string
  mode: AnimeSyncMode
  providers: string[]
  fetched: number
  normalized: number
  canonicalTitles: number
  mergedDuplicates: number
  r2Uploaded: number
  r2Skipped: number
  firestoreUpserted: number
  firestoreSkipped: number
  providerFailures: number
  itemFailures: number
  ambiguousMatches: number
  unsupportedPlaybackUrls: number
  elapsedMs: number
  contentAccepted: Record<AnimeRegion, number>
  mediaTypeAccepted: Record<AnimeMediaType, number>
  commentaryRejected: number
  otherRejected: number
  providerStats: Record<string, ProviderRuntimeStats>
  providerRowsScanned: number
  newCandidates: number
  existingCandidates: number
  canonicalCreated: number
  canonicalUpdated: number
  unchangedTitlesSkipped: number
  operations: SyncOperationCounts
  plannedFirestoreWrites: number
  plannedR2Writes: number
  retryCount: number
  stopReason: SyncStopReason
  checkpoint?: SyncCheckpoint
  incrementalState?: IncrementalSyncState
  incrementalCategories?: IncrementalCategoryScan[]
  knownSourceRowsSkipped?: number
}

export interface ExistingCanonical {
  sourceMappings: Map<string, SourceMapping>
  states: Map<string, SyncState>
}

export interface PreparedCanonicalWrite {
  canonical: CanonicalAnime
  indexHash: string
  detailHash: string
  updatedAtMs: number
  r2Changed: boolean
  indexChanged: boolean
  isNew?: boolean
}
