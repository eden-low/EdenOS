import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnimeRepository } from '../../repositories/animeRepository'
import { selectAnimeHero } from '../../domain/anime'
import { animeSummary } from '../../test/animeFixtures'
import type { AnimeProgress } from '../../types/anime'

const mock = vi.hoisted(() => ({ progress: [] as AnimeProgress[] }))
vi.mock('../../state/useAnimeProgress', () => ({ useAnimeProgress: () => ({ items: mock.progress }) }))

import { AnimeMediaHome, ContinueWatchingRow } from './AnimeMediaHome'

function progress(overrides: Partial<AnimeProgress> = {}): AnimeProgress {
  return {
    externalId: 'frieren', animeId: 'frieren', title: 'Frieren', currentEpisode: 6,
    positionSeconds: 120, durationSeconds: 1440, watchedEpisodes: [1, 2, 3, 4, 5],
    trackingStatus: 'watching', updatedAt: 200, coverUrl: 'https://media.example/frieren.jpg', totalEpisodes: 12,
    ...overrides,
  }
}

function repository(overrides: Partial<AnimeRepository> = {}): AnimeRepository {
  return {
    fetchPage: vi.fn(), searchTitles: vi.fn(), fetchRecent: vi.fn().mockResolvedValue([]),
    countUpdatedSince: vi.fn(), fetchPublishedSince: vi.fn().mockResolvedValue([]),
    countPublishedSince: vi.fn(), getCatalogueStatus: vi.fn(), ...overrides,
  }
}

describe('AnimeMediaHome', () => {
  beforeEach(() => { mock.progress = [] })

  it('selects the latest watching title, then deterministic catalogue fallbacks', () => {
    const older = progress({ externalId: 'older', title: 'Older', updatedAt: 10 })
    const latest = progress({ externalId: 'latest', title: 'Latest', updatedAt: 20 })
    const newlyPublished = animeSummary({ externalId: 'new', title: 'New title' })
    const recent = animeSummary({ externalId: 'recent', title: 'Recent title' })
    const fallback = animeSummary({ externalId: 'fallback', title: 'Fallback title' })
    expect(selectAnimeHero([older, latest], [newlyPublished], [recent], fallback)).toEqual({ kind: 'progress', item: latest })
    expect(selectAnimeHero([], [newlyPublished], [recent], fallback)).toEqual({ kind: 'recent', item: recent })
    expect(selectAnimeHero([], [newlyPublished], [], fallback)).toEqual({ kind: 'new', item: newlyPublished })
    expect(selectAnimeHero([], [], [], fallback)).toEqual({ kind: 'catalogue', item: fallback })
    expect(selectAnimeHero([], [], [])).toBeNull()
  })

  it('renders landscape Continue Watching progress and opens the selected title', () => {
    const onOpen = vi.fn()
    render(<ContinueWatchingRow items={[progress()]} onOpen={onOpen} />)
    expect(screen.getByTestId('continue-watching-row')).not.toBeNull()
    expect(screen.getByText('Episode 6 of 12')).not.toBeNull()
    expect(screen.getByText('50%')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Resume Frieren' }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'frieren', title: 'Frieren' }))
  })

  it('shows a compact Continue Watching empty state', () => {
    render(<ContinueWatchingRow items={[]} onOpen={vi.fn()} />)
    expect(screen.getByText('Start a title from My List and it will appear here.')).not.toBeNull()
    expect(screen.queryByTestId('continue-watching-row')).toBeNull()
  })

  it('keeps new and recent queries bounded and labels historical fallback safely', async () => {
    const recent = animeSummary({ externalId: 'recent', title: 'Historical update', firstPublishedAt: undefined })
    const repo = repository({ fetchRecent: vi.fn().mockResolvedValue([recent]) })
    render(<AnimeMediaHome repository={repo} onOpen={vi.fn()} />)
    expect((await screen.findAllByText('Historical update')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recently updated')).not.toBeNull()
    expect(screen.getByRole('complementary', { name: 'Latest updates' })).not.toBeNull()
    expect(repo.fetchRecent).toHaveBeenCalledWith(6)
    expect(repo.fetchPublishedSince).toHaveBeenCalledWith(expect.any(Date), 6)
    const since = vi.mocked(repo.fetchPublishedSince).mock.calls[0][0]
    expect(since.getDay()).toBe(1)
    expect(since.getHours()).toBe(0)
  })

  it('keeps available sections usable when Recently Updated fails', async () => {
    const newlyPublished = animeSummary({ externalId: 'new', title: 'Actually New', firstPublishedAt: Date.now() })
    const repo = repository({ fetchPublishedSince: vi.fn().mockResolvedValue([newlyPublished]), fetchRecent: vi.fn().mockRejectedValue(new Error('offline')) })
    render(<AnimeMediaHome repository={repo} onOpen={vi.fn()} />)
    expect((await screen.findAllByText('Actually New')).length).toBeGreaterThan(0)
    expect(screen.getByRole('complementary', { name: 'New this week' })).not.toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('Recently updated titles are temporarily unavailable')
  })

  it('navigates from the hero primary action', async () => {
    const onOpen = vi.fn()
    const item = animeSummary({ externalId: 'hero', title: 'Hero title' })
    render(<AnimeMediaHome repository={repository({ fetchRecent: vi.fn().mockResolvedValue([item]) })} onOpen={onOpen} />)
    const action = await screen.findByRole('button', { name: 'Open featured Hero title' })
    fireEvent.click(action)
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ externalId: 'hero' })))
  })
})
