import { indexFilterKeys } from './normalize'
import type { AnimeDetail, AnimeEpisodeSource } from '../../src/types/anime'
import type { CanonicalAnime, ProviderAnimeRecord, SourceMatchReason } from './types'

function sourceLabel(record: ProviderAnimeRecord, groupLabel: string): string {
  return groupLabel && groupLabel.toLocaleLowerCase() !== record.providerDisplayName.toLocaleLowerCase()
    ? `${record.providerDisplayName} · ${groupLabel}`
    : record.providerDisplayName
}

function providerPrefixes(records: ProviderAnimeRecord[]): Set<string> {
  return new Set(records.map((record) => record.providerDisplayName))
}

function belongsToProvider(source: AnimeEpisodeSource, providerNames: Set<string>): boolean {
  return [...providerNames].some((name) => source.label === name || source.label.startsWith(`${name} · `))
}

export function mergeCanonicalAnime(
  externalId: string,
  records: ProviderAnimeRecord[],
  matchedBy: SourceMatchReason,
  priorDetail?: AnimeDetail,
): CanonicalAnime {
  if (!records.length) throw new Error('Cannot merge an empty canonical group')
  const ordered = [...records].sort((left, right) => left.providerPriority - right.providerPriority || left.providerId.localeCompare(right.providerId))
  const primary = ordered[0]
  const currentProviders = providerPrefixes(ordered)
  const episodes = new Map<number, { title?: string; durationSeconds?: number; sources: AnimeEpisodeSource[] }>()
  for (const prior of priorDetail?.episodes ?? []) {
    const sources = prior.sources.filter((source) => !belongsToProvider(source, currentProviders))
    if (sources.length) episodes.set(prior.episodeNumber, { ...(prior.title ? { title: prior.title } : {}), ...(prior.durationSeconds ? { durationSeconds: prior.durationSeconds } : {}), sources })
  }
  for (const record of ordered) {
    for (const source of record.sources) {
      if (!source.episodeNumber) continue
      const episode = episodes.get(source.episodeNumber) ?? { title: source.episodeTitle, sources: [] }
      const normalized: AnimeEpisodeSource = { label: sourceLabel(record, source.groupLabel), url: source.url, format: source.format }
      if (!episode.sources.some((existing) => existing.url === normalized.url)) episode.sources.push(normalized)
      episodes.set(source.episodeNumber, episode)
    }
  }
  const providerOrder = new Map(ordered.map((record, index) => [record.providerDisplayName, index]))
  const detailEpisodes = [...episodes.entries()].map(([episodeNumber, episode]) => ({
    episodeNumber,
    ...(episode.title ? { title: episode.title } : {}),
    ...(episode.durationSeconds ? { durationSeconds: episode.durationSeconds } : {}),
    sources: episode.sources.sort((left, right) => {
      const leftProvider = [...providerOrder.keys()].find((name) => left.label === name || left.label.startsWith(`${name} · `))
      const rightProvider = [...providerOrder.keys()].find((name) => right.label === name || right.label.startsWith(`${name} · `))
      return (providerOrder.get(leftProvider ?? '') ?? 10_000) - (providerOrder.get(rightProvider ?? '') ?? 10_000) || left.label.localeCompare(right.label) || left.url.localeCompare(right.url)
    }),
  })).filter((episode) => episode.sources.length).sort((left, right) => left.episodeNumber - right.episodeNumber)
  const genres = [...new Set(ordered.flatMap((record) => record.genres))].sort()
  const totalEpisodes = ordered.flatMap((record) => record.totalEpisodes ? [record.totalEpisodes] : []).sort((a, b) => b - a)[0]
  const baseIndex = {
    externalId,
    title: primary.title,
    titleNormalized: primary.titleNormalized,
    coverUrl: ordered.find((record) => record.coverUrl)?.coverUrl ?? '',
    ...(ordered.find((record) => record.score !== undefined)?.score !== undefined ? { score: ordered.find((record) => record.score !== undefined)!.score } : {}),
    mediaType: primary.mediaType,
    ...(primary.region ? { region: primary.region } : {}),
    genres,
    status: ordered.some((record) => record.status === 'airing') ? 'airing' as const : 'completed' as const,
    ...(primary.year ? { year: primary.year } : {}),
    ...(totalEpisodes ? { totalEpisodes } : {}),
  }
  const detail: AnimeDetail = {
    schemaVersion: 1,
    externalId,
    title: primary.title,
    ...(ordered.find((record) => record.description)?.description ? { description: ordered.find((record) => record.description)!.description } : {}),
    episodes: detailEpisodes,
  }
  return {
    externalId,
    records: ordered,
    index: { ...baseIndex, filterKeys: indexFilterKeys(baseIndex) },
    detail,
    ...(ordered.flatMap((record) => record.providerUpdatedAt ? [record.providerUpdatedAt] : []).sort((a, b) => b - a)[0]
      ? { providerUpdatedAt: ordered.flatMap((record) => record.providerUpdatedAt ? [record.providerUpdatedAt] : []).sort((a, b) => b - a)[0] }
      : {}),
    matchedBy,
  }
}
