import type { AnimeDetail, AnimeMediaType, AnimeRegion, AnimeStatus, AnimeSummary } from '../../src/types/anime'

export type AnimeSyncMode = 'full' | 'incremental'
export type PlaybackFormat = 'hls' | 'mp4'

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
  message: string
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

export interface AnimeUpstreamProvider {
  readonly config: AnimeProviderConfig
  probe(): Promise<ProviderProbeResult>
  fetchPage(page: number, search?: string): Promise<ProviderPage>
  fetchDetail(providerItemId: string): Promise<ProviderDetail>
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
  stage: 'probe' | 'list' | 'detail' | 'normalize' | 'identity' | 'r2' | 'firestore' | 'media-probe'
  errorCode: string
  message: string
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
}
