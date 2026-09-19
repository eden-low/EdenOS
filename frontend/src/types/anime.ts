export const animeMediaTypes = ['anime', 'movie', 'tv_series', 'documentary'] as const
export const animeStatuses = ['airing', 'completed'] as const
export const animeRegions = ['japan', 'china', 'europe_us', 'korea', 'hong_kong_taiwan', 'other'] as const
export const animeTrackingStatuses = ['watching', 'completed'] as const

export type AnimeMediaType = (typeof animeMediaTypes)[number]
export type AnimeStatus = (typeof animeStatuses)[number]
export type AnimeRegion = (typeof animeRegions)[number]
export type AnimeTrackingStatus = (typeof animeTrackingStatuses)[number]

export interface AnimeSummary {
  externalId: string
  title: string
  titleNormalized: string
  titleZh?: string
  titleEn?: string
  titleNative?: string
  coverUrl: string
  score?: number
  mediaType: AnimeMediaType
  region?: AnimeRegion
  genres: string[]
  status: AnimeStatus
  year?: number
  totalEpisodes?: number
  updatedAt: number
  filterKeys: string[]
}

export interface AnimeCatalogueFilters {
  mediaType?: AnimeMediaType
  region?: AnimeRegion
  genre?: string
  status?: AnimeStatus
  year?: number
}

export interface AnimeCatalogueRequest {
  search: string
  filters: AnimeCatalogueFilters
  cursor?: unknown
  loadedCount?: number
}

export interface AnimeCataloguePage {
  items: AnimeSummary[]
  cursor?: unknown
  total: number
  hasMore: boolean
}

export type AnimeSourceFormat = 'hls' | 'mp4'

export interface AnimeEpisodeSource {
  label: string
  url: string
  format: AnimeSourceFormat
}

export interface AnimeEpisode {
  episodeNumber: number
  title?: string
  durationSeconds?: number
  sources: AnimeEpisodeSource[]
}

export interface AnimeDetail {
  schemaVersion: 1
  externalId: string
  title: string
  description?: string
  episodes: AnimeEpisode[]
}

export interface AnimeProgress {
  externalId: string
  animeId: string
  currentEpisode: number
  positionSeconds: number
  durationSeconds: number
  watchedEpisodes: number[]
  trackingStatus: AnimeTrackingStatus
  updatedAt: number
  title: string
  coverUrl?: string
  totalEpisodes?: number
}
