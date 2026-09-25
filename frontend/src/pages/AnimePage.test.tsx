import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeSummary } from '../test/animeFixtures'

const mock = vi.hoisted(() => ({ fetchPage: vi.fn(), searchTitles: vi.fn(), fetchPublishedSince: vi.fn(), fetchRecent: vi.fn(), getCatalogueStatus: vi.fn(), firestore: {}, progress: { items: [], cloudError: null, saveProgress: vi.fn(), flushProgress: vi.fn() } }))
vi.mock('../repositories/firestoreAnimeRepository', () => ({ createFirestoreAnimeRepository: () => ({ fetchPage: mock.fetchPage, searchTitles: mock.searchTitles, fetchPublishedSince: mock.fetchPublishedSince, fetchRecent: mock.fetchRecent, getCatalogueStatus: mock.getCatalogueStatus }) }))
vi.mock('../state/useFirebaseAuth', () => ({ useFirebaseAuth: () => ({ firestore: mock.firestore }) }))
vi.mock('../state/useAnimeProgress', () => ({ useAnimeProgress: () => mock.progress }))
vi.mock('../components/anime/AnimePlayerDialog', () => ({ AnimePlayerDialog: ({ target }: { target: { title: string } | null }) => target ? <div data-testid="player-target">{target.title}</div> : null }))

import { AnimePage } from './AnimePage'

const catalogue = Array.from({ length: 24 }, (_, index) => animeSummary({ externalId: `anime-${index}`, title: `Anime ${index}`, titleNormalized: `anime ${index}` }))

describe('AnimePage', () => {
  beforeEach(() => {
    vi.useRealTimers(); mock.fetchPage.mockReset(); mock.searchTitles.mockReset()
    mock.fetchPublishedSince.mockResolvedValue([]); mock.fetchRecent.mockResolvedValue([]); mock.getCatalogueStatus.mockResolvedValue(null)
    mock.fetchPage.mockResolvedValue({ items: catalogue, cursor: { id: 'last' }, total: 30, hasMore: true })
  })
  it('renders a 24-card page, count, grid, and opens detail only after a card click', async () => {
    render(<AnimePage />)
    expect(await screen.findByText('Loaded 24 / 30')).not.toBeNull()
    expect(screen.getAllByRole('button', { name: /^Open Anime/ })).toHaveLength(24)
    expect(screen.queryByTestId('player-target')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open Anime 0' }))
    expect(screen.getByTestId('player-target').textContent).toContain('Anime 0')
  })
  it('debounces title search by 300ms and Enter searches immediately', async () => {
    vi.useFakeTimers(); render(<AnimePage />); await act(async () => Promise.resolve())
    const input = screen.getByLabelText(/Search anime/)
    fireEvent.change(input, { target: { value: 'Naruto' } })
    expect(mock.fetchPage).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve() })
    expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Naruto', cursor: undefined }))
    fireEvent.change(input, { target: { value: 'Bleach' } }); fireEvent.submit(input.closest('form')!)
    await act(async () => Promise.resolve())
    expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Bleach' }))
    vi.useRealTimers()
  })
  it('combines filters and resets the cursor', async () => {
    render(<AnimePage />); await screen.findByText('Loaded 24 / 30')
    fireEvent.click(screen.getByRole('button', { name: 'Anime', pressed: false }))
    fireEvent.change(screen.getByLabelText('Genre'), { target: { value: 'Fantasy' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'completed' } })
    await waitFor(() => expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: { mediaType: 'anime', genre: 'Fantasy', status: 'completed' }, cursor: undefined })))
  })
  it('loads more using the cursor and accumulated count', async () => {
    mock.fetchPage.mockResolvedValueOnce({ items: catalogue, cursor: { id: 'last' }, total: 25, hasMore: true }).mockResolvedValueOnce({ items: [animeSummary({ externalId: 'anime-24', title: 'Anime 24' })], total: 25, hasMore: false })
    render(<AnimePage />); await screen.findByText('Loaded 24 / 25')
    fireEvent.click(screen.getByRole('button', { name: 'Load more (24)' }))
    expect(await screen.findByText('Loaded 25 / 25')).not.toBeNull()
    expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: { id: 'last' }, loadedCount: 24 }))
  })
  it('shows loading, empty, and retryable error states', async () => {
    mock.fetchPage.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [], total: 0, hasMore: false })
    render(<AnimePage />)
    expect(screen.getByLabelText('Loading Anime catalogue')).not.toBeNull()
    expect((await screen.findByRole('alert')).textContent).toContain('could not load')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('No catalogue titles match these choices.')).not.toBeNull()
  })

  it('names an empty search and clears it without leaving a stale query', async () => {
    mock.fetchPage.mockReset()
      .mockResolvedValueOnce({ items: catalogue, cursor: { id: 'last' }, total: 30, hasMore: true })
      .mockResolvedValueOnce({ items: [], total: 0, hasMore: false })
      .mockResolvedValueOnce({ items: catalogue, cursor: { id: 'last' }, total: 30, hasMore: true })
    render(<AnimePage />)
    await screen.findByText('Loaded 24 / 30')
    const input = screen.getByLabelText(/Search anime/)
    fireEvent.change(input, { target: { value: 'Solo Leveling' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText('No results found for “Solo Leveling”')).not.toBeNull()
    fireEvent.click(screen.getByText('Clear search'))
    await waitFor(() => expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' })))
  })

  it('shows and applies a clear secondary filters action', async () => {
    render(<AnimePage />)
    await screen.findByText('Loaded 24 / 30')
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'korea' } })
    const clear = await screen.findByRole('button', { name: 'Clear filters' })
    fireEvent.click(clear)
    await waitFor(() => expect(mock.fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ filters: expect.objectContaining({ region: undefined }) })))
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })
})
