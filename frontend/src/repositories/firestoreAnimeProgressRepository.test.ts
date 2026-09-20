import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ onSnapshot: vi.fn(), setDoc: vi.fn(), serverTimestamp: vi.fn(() => ({ server: true })) }))
vi.mock('firebase/firestore', () => ({
  collection: (...parts: unknown[]) => ({ parts }), doc: (reference: unknown, id: string) => ({ reference, id }),
  query: (reference: unknown, ...constraints: unknown[]) => ({ reference, constraints }),
  orderBy: (...args: unknown[]) => ({ args }), onSnapshot: mock.onSnapshot,
  serverTimestamp: mock.serverTimestamp, setDoc: mock.setDoc,
}))

import { createFirestoreAnimeProgressRepository } from './firestoreAnimeProgressRepository'

const progress = { externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2, positionSeconds: 10, durationSeconds: 100, watchedEpisodes: [1], trackingStatus: 'watching' as const, updatedAt: 100, title: 'Sample' }

describe('Firestore Anime progress repository', () => {
  beforeEach(() => { mock.onSnapshot.mockReset(); mock.setDoc.mockReset(); mock.serverTimestamp.mockClear() })
  it('subscribes once to the UID-scoped collection and normalizes cloud data', () => {
    mock.onSnapshot.mockImplementation((_query, next) => { next({ docs: [{ id: 'sample-anime', data: () => ({ ...progress, updatedAt: { toMillis: () => 200 } }) }] }); return () => undefined })
    const repository = createFirestoreAnimeProgressRepository({} as never, 'owner')
    const next = vi.fn(); repository.subscribe({ next, error: vi.fn() })
    expect(next).toHaveBeenCalledWith([{ ...progress, updatedAt: 200 }])
    expect(mock.onSnapshot.mock.calls[0][0].reference.parts).toEqual([{}, 'users', 'owner', 'animeWatchProgress'])
  })
  it('writes one compact document with a server timestamp and no playback URL', async () => {
    mock.setDoc.mockResolvedValue(undefined)
    const repository = createFirestoreAnimeProgressRepository({} as never, 'owner')
    await repository.save(progress)
    const [reference, payload] = mock.setDoc.mock.calls[0]
    expect(reference.id).toBe('sample-anime')
    expect(payload.updatedAt).toEqual({ server: true })
    expect(JSON.stringify(payload)).not.toContain('m3u8')
  })
  it('preserves deterministic fallback episode numbers in the outgoing payload', async () => {
    mock.setDoc.mockResolvedValue(undefined)
    const repository = createFirestoreAnimeProgressRepository({} as never, 'owner')
    await repository.save({ ...progress, currentEpisode: 1_063_306 })
    expect(mock.setDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ currentEpisode: 1_063_306 }))
  })
})
