import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeProgressStorageKey, legacyAnimeProgressStorageKey } from '../services/animeProgressLocalStorage'

const mock = vi.hoisted(() => ({
  save: vi.fn(),
  observers: new Map<string, { next: (items: unknown[]) => void; error: (error: unknown) => void }>(),
  unsubscribes: new Map<string, ReturnType<typeof vi.fn>>(),
  session: { firestore: {}, uid: 'owner', isAnonymous: false },
}))
vi.mock('../repositories/firestoreAnimeProgressRepository', () => ({
  createFirestoreAnimeProgressRepository: (_firestore: unknown, uid: string) => ({
    subscribe(observer: { next: (items: unknown[]) => void; error: (error: unknown) => void }) {
      mock.observers.set(uid, observer)
      const unsubscribe = vi.fn()
      mock.unsubscribes.set(uid, unsubscribe)
      return unsubscribe
    },
    save: (item: unknown) => mock.save(uid, item),
  }),
}))
vi.mock('./useFirebaseAuth', () => ({ useFirebaseAuth: () => mock.session }))

import { AnimeProgressProvider } from './AnimeProgressProvider'
import { useAnimeProgress } from './useAnimeProgress'

const progress = { externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2, positionSeconds: 10, durationSeconds: 100, watchedEpisodes: [1], trackingStatus: 'watching' as const, updatedAt: 200, title: 'Sample' }

function Harness() {
  const value = useAnimeProgress()
  return <><pre data-testid="items">{JSON.stringify(value.items)}</pre><span data-testid="cloud-error">{value.cloudError}</span><button onClick={() => value.saveProgress(progress)}>save</button><button onClick={() => value.saveProgress(progress, { immediate: true })}>save now</button></>
}

describe('AnimeProgressProvider', () => {
  beforeEach(() => { localStorage.clear(); mock.save.mockReset(); mock.save.mockResolvedValue(undefined); mock.observers.clear(); mock.unsubscribes.clear(); mock.session = { firestore: {}, uid: 'owner', isAnonymous: false }; vi.useRealTimers() })

  it('stores anonymous progress under its Firebase UID and writes only that UID path', async () => {
    mock.session = { ...mock.session, uid: 'guest-uid', isAnonymous: true }
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'save now' }))
    expect(localStorage.getItem(animeProgressStorageKey('guest-uid'))).toContain('sample-anime')
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith('guest-uid', expect.objectContaining({ externalId: 'sample-anime' })))
  })

  it('chooses newer local progress and reconciles it to cloud', async () => {
    localStorage.setItem(animeProgressStorageKey('owner'), JSON.stringify({ version: 2, items: [progress] }))
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observers.get('owner')?.next([{ ...progress, currentEpisode: 1, updatedAt: 100 }]))
    await waitFor(() => expect(mock.save).toHaveBeenCalledWith('owner', progress))
    expect(screen.getByTestId('items').textContent).toContain('"currentEpisode":2')
  })

  it('chooses newer cloud progress and updates local recovery', async () => {
    localStorage.setItem(animeProgressStorageKey('owner'), JSON.stringify({ version: 2, items: [progress] }))
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observers.get('owner')?.next([{ ...progress, currentEpisode: 4, updatedAt: 300 }]))
    await waitFor(() => expect(screen.getByTestId('items').textContent).toContain('"currentEpisode":4'))
    expect(localStorage.getItem(animeProgressStorageKey('owner'))).toContain('"currentEpisode":4')
  })

  it('handles a failed reconciliation write without an unhandled rejection', async () => {
    localStorage.setItem(animeProgressStorageKey('owner'), JSON.stringify({
      version: 2,
      items: [{ ...progress, currentEpisode: 1_063_306 }],
    }))
    mock.save.mockRejectedValue(new Error('Missing or insufficient permissions.'))
    render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observers.get('owner')?.next([]))
    await waitFor(() => expect(screen.getByTestId('cloud-error').textContent)
      .toBe('Cloud watch progress is temporarily unavailable.'))
    expect(mock.save).toHaveBeenCalledWith('owner', expect.objectContaining({ currentEpisode: 1_063_306 }))
  })

  it('throttles cloud writes to ten seconds and supports immediate flush', async () => {
    vi.useFakeTimers(); render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>); act(() => mock.observers.get('owner')?.next([])); mock.save.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'save' })); expect(mock.save).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(9_999); await Promise.resolve() }); expect(mock.save).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(1); await Promise.resolve() }); expect(mock.save).toHaveBeenCalledOnce()
    mock.save.mockClear(); fireEvent.click(screen.getByRole('button', { name: 'save now' })); await act(async () => Promise.resolve()); expect(mock.save).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('switches A to B without flashing, merging, or writing A progress into B', () => {
    mock.session = { ...mock.session, uid: 'user-a' }
    localStorage.setItem(animeProgressStorageKey('user-a'), JSON.stringify({ version: 2, items: [progress] }))
    localStorage.setItem(legacyAnimeProgressStorageKey, JSON.stringify({ version: 1, items: [{ ...progress, currentEpisode: 9 }] }))
    const view = render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    expect(screen.getByTestId('items').textContent).toContain('sample-anime')

    mock.session = { ...mock.session, uid: 'user-b' }
    view.rerender(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    expect(screen.getByTestId('items').textContent).toBe('[]')
    expect(mock.unsubscribes.get('user-a')).toHaveBeenCalledOnce()
    act(() => mock.observers.get('user-a')?.next([{ ...progress, currentEpisode: 8 }]))
    expect(screen.getByTestId('items').textContent).toBe('[]')
    expect(localStorage.getItem(animeProgressStorageKey('user-b'))).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'save now' }))
    expect(localStorage.getItem(animeProgressStorageKey('user-b'))).toContain('sample-anime')
    expect(localStorage.getItem(animeProgressStorageKey('user-a'))).toContain('"currentEpisode":2')
  })

  it('keeps progress when an anonymous account links Google without changing UID', () => {
    mock.session = { ...mock.session, uid: 'stable-uid', isAnonymous: true }
    const view = render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    mock.session = { ...mock.session, isAnonymous: false }
    view.rerender(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    expect(screen.getByTestId('items').textContent).toContain('sample-anime')
  })

  it('cancels a queued A write before mounting B', async () => {
    vi.useFakeTimers()
    mock.session = { ...mock.session, uid: 'user-a' }
    const view = render(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    act(() => mock.observers.get('user-a')?.next([]))
    mock.save.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'save' }))

    mock.session = { ...mock.session, uid: 'user-b' }
    view.rerender(<AnimeProgressProvider><Harness /></AnimeProgressProvider>)
    await act(async () => { vi.advanceTimersByTime(10_000); await Promise.resolve() })
    expect(mock.save).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
