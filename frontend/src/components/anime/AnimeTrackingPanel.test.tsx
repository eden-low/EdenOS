import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeSummary } from '../../test/animeFixtures'

const mock = vi.hoisted(() => ({ save: vi.fn(), items: [] as Array<Record<string, unknown>> }))
vi.mock('../../state/useAnimeProgress', () => ({ useAnimeProgress: () => ({ items: mock.items, saveProgress: mock.save, cloudError: null }) }))

import { AnimeTrackingPanel } from './AnimeTrackingPanel'

describe('AnimeTrackingPanel', () => {
  beforeEach(() => { mock.save.mockReset(); mock.items = [] })
  it('shows Watching and Finished as one filtered poster list', () => {
    mock.items = [
      { externalId: 'one', animeId: 'one', title: 'One', currentEpisode: 2, positionSeconds: 1, durationSeconds: 2, watchedEpisodes: [], trackingStatus: 'watching', updatedAt: 2 },
      { externalId: 'two', animeId: 'two', title: 'Two', currentEpisode: 12, positionSeconds: 2, durationSeconds: 2, watchedEpisodes: [12], trackingStatus: 'completed', updatedAt: 1 },
    ]
    render(<AnimeTrackingPanel repository={{ fetchPage: vi.fn(), searchTitles: vi.fn(), fetchRecent: vi.fn(), countUpdatedSince: vi.fn(), fetchPublishedSince: vi.fn(), countPublishedSince: vi.fn(), getCatalogueStatus: vi.fn() }} onOpen={vi.fn()} />)
    expect(screen.getByText('One')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Finished 1/ }))
    expect(screen.getByText('Two')).not.toBeNull()
    expect(screen.getAllByText('Finished')).toHaveLength(2)
  })
  it('manually searches the catalogue, selects a real title, and saves progress', async () => {
    vi.useFakeTimers()
    const title = animeSummary()
    const repository = { fetchPage: vi.fn(), searchTitles: vi.fn().mockResolvedValue([title]), fetchRecent: vi.fn(), countUpdatedSince: vi.fn(), fetchPublishedSince: vi.fn(), countPublishedSince: vi.fn(), getCatalogueStatus: vi.fn() }
    render(<AnimeTrackingPanel repository={repository} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Anime' }))
    fireEvent.change(screen.getByLabelText('Search catalogue'), { target: { value: 'Sample' } })
    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve() })
    expect(screen.getByRole('button', { name: /Sample Anime/ })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Sample Anime/ }))
    fireEvent.change(screen.getByLabelText('Current episode'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'sample-anime', currentEpisode: 4, trackingStatus: 'watching' }), { immediate: true })
    vi.useRealTimers()
  })
})
