import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeProgressStorageKey } from '../services/animeProgressLocalStorage'

const mock = vi.hoisted(() => ({ save: vi.fn(), observer: null as null | { next: (items: unknown[]) => void; error: (error: unknown) => void }, session: { firestore: {}, uid: 'owner', isAnonymous: false } }))
vi.mock('../repositories/firestoreAnimeProgressRepository', () => ({ createFirestoreAnimeProgressRepository: () => ({ subscribe(observer: typeof mock.observer) { mock.observer = observer; return () => undefined }, save: mock.save }) }))
vi.mock('./useFirebaseAuth', () => ({ useFirebaseAuth: () => mock.session }))

import { AnimeProgressProvider } from './AnimeProgressProvider'
import { useAnimeProgress } from './useAnimeProgress'

const progress = { externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2, positionSeconds: 10, durationSeconds: 100, watchedEpisodes: [1], trackingStatus: 'watching' as const, updatedAt: 200, title: 'Sample' }

function Harness() {
  const value = useAnimeProgress()
  return <><pre data-testid="items">{JSON.stringify(value.items)}</pre><button onClick={() => value.saveProgress(progress)}>save</button><button onClick={() => value.saveProgress(progress, { immediate: true })}>save now</button></>
}

describe('AnimeProgressProvider', () => {
  beforeEach(() => { localStorage.clear(); mock.save.mockReset(); mock.save.mockResolvedValue(undefined); mock.observer = null; mock.session = { firestore: {}, uid: 'owner', isAnonymous: false }; vi.useRealTimers() })

  it('keeps anonymous progress local and never writes Firestore', () => {
    mock.session = { ...mock.session, isAnonymous: true }
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'save now' }))
    expect(localStorage.getItem(animeProgressStorageKey)).toContain('sample-anime')
    expect(mock.save).not.toHaveBeenCalled()
  })

  it('chooses newer local progress and reconciles it to cloud', async () => {
    localStorage.setItem(animeProgressStorageKey, JSON.stringify({ version: 1, items: [progress] }))
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observer?.next([{ ...progress, currentEpisode: 1, updatedAt: 100 }]))
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith(progress))
    expect(screen.getByTestId('items').textContent).toContain('"currentEpisode":2')
  })

  it('chooses newer cloud progress and updates local recovery', async () => {
    localStorage.setItem(animeProgressStorageKey, JSON.stringify({ version: 1, items: [progress] }))
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observer?.next([{ ...progress, currentEpisode: 4, updatedAt: 300 }]))
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('"currentEpisode":4'))
    expect(localStorage.getItem(animeProgressStorageKey)).toContain('"currentEpisode":4')
  })

  it('throttles cloud writes to ten seconds and supports immediate flush', async () => {
    vi.useFakeTimers(); render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>); act(() => mock.observer?.next([])); mock.save.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'save' })); expect(mock.save).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(9_999); await Promise.resolve() }); expect(mock.save).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve() }); expect(mock.save).toHaveBeenCalledOnce()
    mock.save.mockClear(); fireEvent.click(screen.getByRole('button', { name: 'save now' })); await act(async () => Promise.resolve()); expect(mock.save).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
