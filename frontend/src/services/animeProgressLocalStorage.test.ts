import { beforeEach, describe, expect, it } from 'vitest'
import {
  animeProgressStorageKey, legacyAnimeProgressStorageKey,
  readLocalAnimeProgress, writeLocalAnimeProgress,
} from './animeProgressLocalStorage'

const progress = { externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 3, positionSeconds: 20, durationSeconds: 100, watchedEpisodes: [1, 2], trackingStatus: 'watching' as const, updatedAt: 100, title: 'Sample' }

describe('Anime local progress', () => {
  beforeEach(() => localStorage.clear())
  it('saves and restores the versioned compact model', () => {
    writeLocalAnimeProgress(localStorage, 'user-a', [progress])
    expect(readLocalAnimeProgress(localStorage, 'user-a')).toEqual([progress])
    expect(localStorage.getItem(animeProgressStorageKey('user-a'))).not.toContain('m3u8')
  })
  it('ignores malformed and outdated storage', () => {
    localStorage.setItem(animeProgressStorageKey('user-a'), '{bad')
    expect(readLocalAnimeProgress(localStorage, 'user-a')).toEqual([])
    localStorage.setItem(animeProgressStorageKey('user-a'), JSON.stringify({ version: 1, items: [progress] }))
    expect(readLocalAnimeProgress(localStorage, 'user-a')).toEqual([])
  })
  it('isolates every Firebase UID, including anonymous UIDs', () => {
    writeLocalAnimeProgress(localStorage, 'user-a', [progress])
    expect(readLocalAnimeProgress(localStorage, 'user-b')).toEqual([])
    expect(readLocalAnimeProgress(localStorage, 'guest-uid')).toEqual([])
    writeLocalAnimeProgress(localStorage, 'guest-uid', [{ ...progress, currentEpisode: 5 }])
    expect(readLocalAnimeProgress(localStorage, 'user-a')[0].currentEpisode).toBe(3)
    expect(readLocalAnimeProgress(localStorage, 'guest-uid')[0].currentEpisode).toBe(5)
  })
  it('preserves but never automatically claims the legacy global history', () => {
    const legacy = JSON.stringify({ version: 1, items: [progress] })
    localStorage.setItem(legacyAnimeProgressStorageKey, legacy)
    expect(readLocalAnimeProgress(localStorage, 'owner-uid')).toEqual([])
    expect(readLocalAnimeProgress(localStorage, 'other-uid')).toEqual([])
    expect(localStorage.getItem(legacyAnimeProgressStorageKey)).toBe(legacy)
  })
})
