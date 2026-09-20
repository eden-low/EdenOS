import { beforeEach, describe, expect, it } from 'vitest'
import { animeProgressStorageKey, readLocalAnimeProgress, writeLocalAnimeProgress } from './animeProgressLocalStorage'

const progress = { externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 3, positionSeconds: 20, durationSeconds: 100, watchedEpisodes: [1, 2], trackingStatus: 'watching' as const, updatedAt: 100, title: 'Sample' }

describe('Anime local progress', () => {
  beforeEach(() => localStorage.clear())
  it('saves and restores the versioned compact model', () => {
    writeLocalAnimeProgress(localStorage, [progress])
    expect(readLocalAnimeProgress(localStorage)).toEqual([progress])
    expect(localStorage.getItem(animeProgressStorageKey)).not.toContain('m3u8')
  })
  it('ignores malformed and outdated storage', () => {
    localStorage.setItem(animeProgressStorageKey, '{bad')
    expect(readLocalAnimeProgress(localStorage)).toEqual([])
    localStorage.setItem(animeProgressStorageKey, JSON.stringify({ version: 2, items: [progress] }))
    expect(readLocalAnimeProgress(localStorage)).toEqual([])
  })
})
