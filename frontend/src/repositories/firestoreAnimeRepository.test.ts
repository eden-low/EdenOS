import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeSummary } from '../test/animeFixtures'

const mock = vi.hoisted(() => ({ getDocs: vi.fn(), getCountFromServer: vi.fn(), getDoc: vi.fn() }))

vi.mock('firebase/firestore', () => ({
  collection: (...parts: unknown[]) => ({ kind: 'collection', parts }),
  doc: (...parts: unknown[]) => ({ kind: 'doc', parts }),
  query: (reference: unknown, ...constraints: unknown[]) => ({ reference, constraints }),
  where: (...args: unknown[]) => ({ kind: 'where', args }),
  orderBy: (...args: unknown[]) => ({ kind: 'orderBy', args }),
  startAt: (...args: unknown[]) => ({ kind: 'startAt', args }),
  endAt: (...args: unknown[]) => ({ kind: 'endAt', args }),
  startAfter: (...args: unknown[]) => ({ kind: 'startAfter', args }),
  limit: (...args: unknown[]) => ({ kind: 'limit', args }),
  getDocs: mock.getDocs,
  getCountFromServer: mock.getCountFromServer,
  getDoc: mock.getDoc,
  Timestamp: { fromDate: (value: Date) => ({ kind: 'timestamp', value }) },
}))

import { createFirestoreAnimeRepository } from './firestoreAnimeRepository'

function snapshot(index: number) {
  const anime = animeSummary({ externalId: `anime-${index}`, title: `Anime ${index}`, titleNormalized: `anime ${index}` })
  return { id: anime.externalId, data: () => ({ ...anime, updatedAt: { toMillis: () => anime.updatedAt } }) }
}

describe('Firestore Anime repository', () => {
  beforeEach(() => { mock.getDocs.mockReset(); mock.getCountFromServer.mockReset(); mock.getDoc.mockReset() })

  it('requests exactly 24 items ordered by updatedAt descending and returns the count', async () => {
    mock.getDocs.mockResolvedValue({ docs: Array.from({ length: 24 }, (_, index) => snapshot(index)) })
    mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 30 }) })
    const repository = createFirestoreAnimeRepository({} as never)
    const page = await repository.fetchPage({ search: '', filters: {} })
    expect(page.items).toHaveLength(24)
    expect(page.total).toBe(30)
    expect(page.hasMore).toBe(true)
    const request = mock.getDocs.mock.calls[0][0]
    expect(request.constraints).toContainEqual({ kind: 'orderBy', args: ['updatedAt', 'desc'] })
    expect(request.constraints).toContainEqual({ kind: 'limit', args: [24] })
  })

  it('uses one combined filter key and resets pagination when no cursor is supplied', async () => {
    mock.getDocs.mockResolvedValue({ docs: [] }); mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) })
    const repository = createFirestoreAnimeRepository({} as never)
    await repository.fetchPage({ search: '', filters: { mediaType: 'anime', genre: 'Fantasy', status: 'completed' } })
    const constraints = mock.getDocs.mock.calls[0][0].constraints
    expect(constraints).toContainEqual({ kind: 'where', args: ['filterKeys', 'array-contains', 'genre:fantasy|mediaType:anime|status:completed'] })
    expect(constraints.some((item: { kind: string }) => item.kind === 'startAfter')).toBe(false)
  })

  it('uses cursor pagination and stops after the loaded total', async () => {
    mock.getDocs.mockResolvedValue({ docs: Array.from({ length: 24 }, (_, index) => snapshot(index + 24)) })
    mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 48 }) })
    const repository = createFirestoreAnimeRepository({} as never)
    const page = await repository.fetchPage({ search: '', filters: {}, cursor: { id: 'cursor' }, loadedCount: 24 })
    expect(page.hasMore).toBe(false)
    expect(mock.getDocs.mock.calls[0][0].constraints).toContainEqual({ kind: 'startAfter', args: [{ id: 'cursor' }] })
  })

  it('performs normalized prefix search without downloading the catalogue', async () => {
    mock.getDocs.mockResolvedValue({ docs: [snapshot(1)] }); mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 1 }) })
    const repository = createFirestoreAnimeRepository({} as never)
    await repository.fetchPage({ search: '  ANIME ', filters: {} })
    const constraints = mock.getDocs.mock.calls[0][0].constraints
    expect(constraints).toContainEqual({ kind: 'orderBy', args: ['titleNormalized', 'asc'] })
    expect(constraints).toContainEqual({ kind: 'startAt', args: ['anime'] })
    expect(constraints).toContainEqual({ kind: 'endAt', args: ['anime\uf8ff'] })
  })

  it('manual title search is bounded and empty search makes no request', async () => {
    mock.getDocs.mockResolvedValue({ docs: [snapshot(1)] })
    const repository = createFirestoreAnimeRepository({} as never)
    await expect(repository.searchTitles('')).resolves.toEqual([])
    expect(mock.getDocs).not.toHaveBeenCalled()
    await repository.searchTitles('Sample', 8)
    expect(mock.getDocs.mock.calls[0][0].constraints).toContainEqual({ kind: 'limit', args: [8] })
  })

  it('keeps Home queries bounded and counts updates on the server', async () => {
    mock.getDocs.mockResolvedValue({ docs: [snapshot(1)] })
    mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 3 }) })
    const repository = createFirestoreAnimeRepository({} as never)
    await expect(repository.fetchRecent(4)).resolves.toHaveLength(1)
    expect(mock.getDocs.mock.calls[0][0].constraints).toContainEqual({ kind: 'limit', args: [4] })
    const since = new Date('2026-09-26T00:00:00.000Z')
    await expect(repository.countUpdatedSince(since)).resolves.toBe(3)
    expect(mock.getCountFromServer.mock.calls[0][0].constraints).toContainEqual({ kind: 'where', args: ['updatedAt', '>=', since] })
  })

  it('queries newly published titles and exposes only sanitized catalogue status', async () => {
    mock.getDocs.mockResolvedValue({ docs: [snapshot(1)] })
    mock.getCountFromServer.mockResolvedValue({ data: () => ({ count: 2 }) })
    mock.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ catalogueCount: 11870, lastSuccessfulSyncAt: { toMillis: () => 1234 }, providerCheckpoint: 'hidden' }) })
    const repository = createFirestoreAnimeRepository({} as never)
    const since = new Date('2026-09-22T00:00:00.000Z')
    await repository.fetchPublishedSince(since, 6)
    expect(mock.getDocs.mock.calls[0][0].constraints).toContainEqual({ kind: 'where', args: ['firstPublishedAt', '>=', { kind: 'timestamp', value: since }] })
    await expect(repository.countPublishedSince(since)).resolves.toBe(2)
    await expect(repository.getCatalogueStatus()).resolves.toEqual({ catalogueCount: 11870, lastSuccessfulSyncAt: 1234 })
  })
})
