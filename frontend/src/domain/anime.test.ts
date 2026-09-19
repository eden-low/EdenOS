import { describe, expect, it } from 'vitest'
import { animeDetail, animeSummary } from '../test/animeFixtures'
import {
  animeFilterKeysForIngestion, animePageSize, animeSearchDebounceMs, animeWatchedThreshold,
  buildAnimeFilterKey, isAnimeProgress, normalizeAnimeProgress, normalizeAnimeTitle, parseAnimeDetail,
} from './anime'

describe('Anime domain', () => {
  it('uses the required paging, debounce, and watched thresholds', () => {
    expect(animePageSize).toBe(24)
    expect(animeSearchDebounceMs).toBe(300)
    expect(animeWatchedThreshold).toBe(0.9)
  })

  it('normalizes searchable titles deterministically', () => {
    expect(normalizeAnimeTitle('  My   ANIME  ')).toBe('my anime')
  })

  it('keeps playback and detail fields out of catalogue documents', () => {
    const catalogue = animeSummary() as unknown as Record<string, unknown>
    expect(catalogue.playbackUrl).toBeUndefined()
    expect(catalogue.episodes).toBeUndefined()
    expect(catalogue.description).toBeUndefined()
  })

  it('builds one stable key for combined filter groups', () => {
    expect(buildAnimeFilterKey({ status: 'completed', genre: 'Fantasy', mediaType: 'anime' }))
      .toBe('genre:fantasy|mediaType:anime|status:completed')
    const keys = animeFilterKeysForIngestion(animeSummary())
    expect(keys).toContain('genre:fantasy|mediaType:anime|status:completed|year:2025')
  })

  it('parses a versioned detail without exposing malformed sources', () => {
    expect(parseAnimeDetail(animeDetail(), 'sample-anime')?.episodes).toHaveLength(2)
    const unsafe = animeDetail({ episodes: [{ episodeNumber: 1, sources: [{ label: 'Bad', url: 'javascript:alert(1)', format: 'hls' }] }] })
    expect(parseAnimeDetail(unsafe, 'sample-anime')).toBeNull()
  })

  it('rejects malformed details and duplicate episode numbers', () => {
    expect(parseAnimeDetail({ schemaVersion: 1 }, 'sample-anime')).toBeNull()
    const duplicate = animeDetail({ episodes: [animeDetail().episodes[0], animeDetail().episodes[0]] })
    expect(parseAnimeDetail(duplicate, 'sample-anime')?.episodes).toHaveLength(1)
  })

  it('deduplicates watched episodes and validates progress', () => {
    const progress = normalizeAnimeProgress({ externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2, positionSeconds: 2, durationSeconds: 10, watchedEpisodes: [2, 1, 2], trackingStatus: 'watching', updatedAt: 10, title: 'Sample' })
    expect(progress.watchedEpisodes).toEqual([1, 2])
    expect(isAnimeProgress(progress)).toBe(true)
    expect(isAnimeProgress({ ...progress, positionSeconds: -1 })).toBe(false)
  })
})
