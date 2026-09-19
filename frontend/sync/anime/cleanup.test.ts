import { describe, expect, it, vi } from 'vitest'
import { applyAnimeCleanup, classifyExistingCatalogue } from './cleanup'
import type { AnimeContentDecision } from './contentPolicy'
import type { AnimeSyncStore, ExistingCatalogueRecord } from './firebaseAdminStore'
import type { AnimeDetailStore } from './r2Store'

function accepted(region: 'japan' | 'europe_us', group: 'east_asia_anime' | 'western_anime'): AnimeContentDecision {
  return {
    accepted: true,
    region,
    mediaType: 'anime',
    group,
    requiredGenres: [],
    category: { typeId: group === 'east_asia_anime' ? '30' : '31', typeName: group === 'east_asia_anime' ? '日韩动漫' : '欧美动漫', group, mediaType: 'anime', fallbackRegion: region, requiredGenres: [] },
  }
}

const records: ExistingCatalogueRecord[] = [
  { externalId: 'japanese', title: 'Frieren', mediaType: 'anime', region: 'japan', year: 2023 },
  { externalId: 'commentary', title: '某电影【电影解说】', mediaType: 'anime', region: 'china' },
  { externalId: 'movie', title: 'Ordinary Movie', mediaType: 'movie', region: 'europe_us' },
]

describe('Anime cleanup', () => {
  it('keeps only catalogue records backed by accepted source categories', () => {
    const decisions = new Map([
      ['japanese', [accepted('japan', 'east_asia_anime')]],
      ['commentary', [{ accepted: false as const, reason: 'commentary' as const }]],
      ['movie', [{ accepted: false as const, reason: 'category-not-allowed' as const }]],
    ])
    expect(classifyExistingCatalogue(records, decisions)).toEqual([
      expect.objectContaining({ externalId: 'japanese', action: 'keep' }),
      expect.objectContaining({ externalId: 'commentary', action: 'remove', reason: 'commentary' }),
      expect.objectContaining({ externalId: 'movie', action: 'remove', reason: 'other-non-anime' }),
    ])
  })

  it('keeps a record when a mapped provider cannot be verified', () => {
    expect(classifyExistingCatalogue([records[2]], new Map([['movie', [null]]]))).toEqual([
      expect.objectContaining({ externalId: 'movie', action: 'keep', reason: 'unverified-source' }),
    ])
  })

  it('removes only the later canonical ID for an exact accepted duplicate', () => {
    const duplicateRecords: ExistingCatalogueRecord[] = [
      { externalId: 'anime-a', title: 'Same Title', mediaType: 'anime', region: 'europe_us', year: 2026 },
      { externalId: 'anime-b', title: 'Same Title', mediaType: 'anime', region: 'europe_us', year: 2026 },
      { externalId: 'anime-c', title: 'Same Title', mediaType: 'anime', region: 'europe_us', year: 2025 },
    ]
    const decisions = new Map<string, Array<AnimeContentDecision | null>>()
    for (const externalId of ['anime-a', 'anime-b', 'anime-c']) decisions.set(externalId, [
      accepted('europe_us', 'western_anime'),
    ])
    expect(classifyExistingCatalogue(duplicateRecords, decisions)).toEqual([
      expect.objectContaining({ externalId: 'anime-a', action: 'keep' }),
      expect.objectContaining({ externalId: 'anime-b', action: 'remove', reason: 'duplicate-canonical' }),
      expect.objectContaining({ externalId: 'anime-c', action: 'keep' }),
    ])
  })

  it('deletes only catalogue, R2, and internal sync metadata while leaving progress untouched', async () => {
    const events: string[] = []
    const store = {
      deleteCatalogue: vi.fn(async () => { events.push('catalogue') }),
      deleteInternalMetadata: vi.fn(async () => { events.push('metadata') }),
    } as unknown as AnimeSyncStore
    const detailStore = { remove: vi.fn(async () => { events.push('r2') }) } as unknown as AnimeDetailStore
    await applyAnimeCleanup({ classifications: [], removeExternalIds: ['bad'], removeMappingDocumentIds: ['map'], orphanedProgressExternalIds: ['bad'], total: 1, keep: 0, remove: 1, commentary: 1, otherNonAnime: 0, duplicateCanonical: 0 }, store, detailStore)
    expect(events).toEqual(['catalogue', 'r2', 'metadata'])
    expect(store.deleteCatalogue).toHaveBeenCalledWith(['bad'])
    expect(store.deleteInternalMetadata).toHaveBeenCalledWith(['bad'], ['map'])
  })
})
