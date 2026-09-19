import {
  animeMediaTypes,
  animeRegions,
  animeStatuses,
  animeTrackingStatuses,
  type AnimeCatalogueFilters,
  type AnimeDetail,
  type AnimeProgress,
  type AnimeSummary,
} from '../types/anime'

export const animePageSize = 24
export const animeSearchDebounceMs = 300
export const animeProgressWriteIntervalMs = 10_000
export const animeWatchedThreshold = 0.9
export const animeEpisodeSegmentSize = 50

export function normalizeAnimeTitle(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isValidExternalId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && typeof value === 'number' && value > 0 ? value : undefined
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function parseAnimeDetail(input: unknown, expectedExternalId?: string): AnimeDetail | null {
  if (!input || typeof input !== 'object') return null
  const data = input as Record<string, unknown>
  if (data.schemaVersion !== 1 || typeof data.externalId !== 'string' ||
      !isValidExternalId(data.externalId) ||
      (expectedExternalId !== undefined && data.externalId !== expectedExternalId) ||
      typeof data.title !== 'string' || !data.title.trim() || !Array.isArray(data.episodes)) return null

  const episodeNumbers = new Set<number>()
  const episodes = data.episodes.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const episode = raw as Record<string, unknown>
    if (!Number.isInteger(episode.episodeNumber) || typeof episode.episodeNumber !== 'number' ||
        episode.episodeNumber <= 0 || episodeNumbers.has(episode.episodeNumber) ||
        !Array.isArray(episode.sources)) return []
    const sources = episode.sources.flatMap((rawSource) => {
      if (!rawSource || typeof rawSource !== 'object') return []
      const source = rawSource as Record<string, unknown>
      if (typeof source.label !== 'string' || !source.label.trim() ||
          typeof source.url !== 'string' || !isSafeHttpUrl(source.url) ||
          (source.format !== 'hls' && source.format !== 'mp4')) return []
      return [{ label: source.label.trim(), url: source.url, format: source.format as 'hls' | 'mp4' }]
    })
    if (sources.length === 0) return []
    episodeNumbers.add(episode.episodeNumber)
    return [{
      episodeNumber: episode.episodeNumber,
      ...(optionalString(episode.title) ? { title: optionalString(episode.title) } : {}),
      ...(optionalPositiveInteger(episode.durationSeconds)
        ? { durationSeconds: optionalPositiveInteger(episode.durationSeconds) } : {}),
      sources,
    }]
  }).sort((a, b) => a.episodeNumber - b.episodeNumber)

  if (episodes.length === 0) return null
  return {
    schemaVersion: 1,
    externalId: data.externalId,
    title: data.title.trim(),
    ...(optionalString(data.description) ? { description: optionalString(data.description) } : {}),
    episodes,
  }
}

export function buildAnimeFilterKey(filters: AnimeCatalogueFilters): string | null {
  const entries = Object.entries(filters)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '')
    .sort(([left], [right]) => left.localeCompare(right))
  return entries.length === 0
    ? null
    : entries.map(([key, value]) => `${key}:${String(value).toLowerCase()}`).join('|')
}

export function animeFilterKeysForIngestion(anime: Pick<AnimeSummary, 'mediaType' | 'region' | 'genres' | 'status' | 'year'>): string[] {
  const dimensions: Array<Array<[keyof AnimeCatalogueFilters, string | number]>> = [
    [['mediaType', anime.mediaType] as [keyof AnimeCatalogueFilters, string]],
    anime.region ? [['region', anime.region] as [keyof AnimeCatalogueFilters, string]] : [],
    anime.genres.map((genre) => ['genre', genre] as [keyof AnimeCatalogueFilters, string]),
    [['status', anime.status] as [keyof AnimeCatalogueFilters, string]],
    anime.year ? [['year', anime.year] as [keyof AnimeCatalogueFilters, number]] : [],
  ].filter((dimension) => dimension.length > 0)
  const keys = new Set<string>()
  function visit(index: number, selected: Array<[keyof AnimeCatalogueFilters, string | number]>) {
    if (index === dimensions.length) {
      if (selected.length > 0) {
        const key = buildAnimeFilterKey(Object.fromEntries(selected) as AnimeCatalogueFilters)
        if (key) keys.add(key)
      }
      return
    }
    visit(index + 1, selected)
    for (const option of dimensions[index]) visit(index + 1, [...selected, option])
  }
  visit(0, [])
  return [...keys]
}

export function normalizeAnimeProgress(progress: AnimeProgress): AnimeProgress {
  const watchedEpisodes = [...new Set(progress.watchedEpisodes
    .filter((episode) => Number.isInteger(episode) && episode > 0))].sort((a, b) => a - b)
  return {
    ...progress,
    currentEpisode: Math.max(1, Math.trunc(progress.currentEpisode)),
    positionSeconds: Math.max(0, progress.positionSeconds),
    durationSeconds: Math.max(0, progress.durationSeconds),
    watchedEpisodes,
  }
}

export function progressForSummary(summary: AnimeSummary, currentEpisode = 1, trackingStatus: AnimeProgress['trackingStatus'] = 'watching'): AnimeProgress {
  return normalizeAnimeProgress({
    externalId: summary.externalId,
    animeId: summary.externalId,
    currentEpisode,
    positionSeconds: 0,
    durationSeconds: 0,
    watchedEpisodes: [],
    trackingStatus,
    updatedAt: Date.now(),
    title: summary.title,
    coverUrl: summary.coverUrl,
    totalEpisodes: summary.totalEpisodes,
  })
}

export function isAnimeProgress(value: unknown): value is AnimeProgress {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return typeof data.externalId === 'string' && isValidExternalId(data.externalId) &&
    data.animeId === data.externalId && Number.isInteger(data.currentEpisode) &&
    typeof data.currentEpisode === 'number' && data.currentEpisode > 0 &&
    typeof data.positionSeconds === 'number' && Number.isFinite(data.positionSeconds) && data.positionSeconds >= 0 &&
    typeof data.durationSeconds === 'number' && Number.isFinite(data.durationSeconds) && data.durationSeconds >= 0 &&
    Array.isArray(data.watchedEpisodes) && data.watchedEpisodes.every((episode) => Number.isInteger(episode) && episode > 0) &&
    typeof data.trackingStatus === 'string' && animeTrackingStatuses.some((status) => status === data.trackingStatus) &&
    typeof data.updatedAt === 'number' && Number.isFinite(data.updatedAt) && data.updatedAt > 0 &&
    typeof data.title === 'string' && !!data.title.trim() &&
    (data.coverUrl === undefined || typeof data.coverUrl === 'string') &&
    (data.totalEpisodes === undefined || optionalPositiveInteger(data.totalEpisodes) !== undefined)
}

export function isAnimeMediaType(value: unknown): value is AnimeSummary['mediaType'] {
  return typeof value === 'string' && animeMediaTypes.some((type) => type === value)
}

export function isAnimeRegion(value: unknown): value is NonNullable<AnimeSummary['region']> {
  return typeof value === 'string' && animeRegions.some((region) => region === value)
}

export function isAnimeStatus(value: unknown): value is AnimeSummary['status'] {
  return typeof value === 'string' && animeStatuses.some((status) => status === value)
}
