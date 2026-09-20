import { describe, expect, it } from 'vitest'
import type { AnimeProgress } from '../types/anime'
import { reconcileAnimeProgress } from './animeProgressReconciliation'

const base: AnimeProgress = {
  externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 1,
  positionSeconds: 10, durationSeconds: 100, watchedEpisodes: [],
  trackingStatus: 'watching', updatedAt: 100, title: 'Sample',
}

describe('Anime progress reconciliation', () => {
  it('keeps newer Guest local progress over older Google cloud progress', () => {
    const local = { ...base, currentEpisode: 3, updatedAt: 300 }
    const cloud = { ...base, currentEpisode: 2, updatedAt: 200 }
    expect(reconcileAnimeProgress([local], [cloud])).toEqual([local])
  })

  it('keeps newer Google cloud progress over older Guest local progress', () => {
    const local = { ...base, currentEpisode: 2, updatedAt: 200 }
    const cloud = { ...base, currentEpisode: 4, updatedAt: 400 }
    expect(reconcileAnimeProgress([local], [cloud])).toEqual([cloud])
  })

  it('preserves progress that exists on only one side', () => {
    const localOnly = { ...base, externalId: 'local', animeId: 'local', updatedAt: 300 }
    const cloudOnly = { ...base, externalId: 'cloud', animeId: 'cloud', updatedAt: 200 }
    expect(reconcileAnimeProgress([localOnly], [cloudOnly])).toEqual([localOnly, cloudOnly])
  })
})
