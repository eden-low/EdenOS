import { animeFilterKeysForIngestion, normalizeAnimeTitle } from '../domain/anime'
import type { AnimeDetail, AnimeSummary } from '../types/anime'

export function animeSummary(overrides: Partial<AnimeSummary> = {}): AnimeSummary {
  const base = {
    externalId: 'sample-anime', title: 'Sample Anime', titleNormalized: normalizeAnimeTitle('Sample Anime'),
    coverUrl: 'https://media.example/cover.jpg', score: 8.4, mediaType: 'anime' as const,
    region: 'japan' as const, genres: ['Fantasy'], status: 'completed' as const,
    year: 2025, totalEpisodes: 12, updatedAt: 1_700_000_000_000,
  }
  return { ...base, filterKeys: animeFilterKeysForIngestion(base), ...overrides }
}

export function animeDetail(overrides: Partial<AnimeDetail> = {}): AnimeDetail {
  return {
    schemaVersion: 1, externalId: 'sample-anime', title: 'Sample Anime', description: 'A safe description.',
    episodes: [
      { episodeNumber: 1, title: 'Start', durationSeconds: 1440, sources: [{ label: 'Primary', url: 'https://media.example/1.m3u8', format: 'hls' }] },
      { episodeNumber: 2, sources: [{ label: 'MP4', url: 'https://media.example/2.mp4', format: 'mp4' }] },
    ],
    ...overrides,
  }
}
