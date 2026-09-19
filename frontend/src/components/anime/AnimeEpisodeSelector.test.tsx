import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimeEpisodeSelector } from './AnimeEpisodeSelector'

const episodes = Array.from({ length: 120 }, (_, index) => ({ episodeNumber: index + 1, sources: [{ label: 'MP4', url: `https://media.example/${index + 1}.mp4`, format: 'mp4' as const }] }))

describe('AnimeEpisodeSelector', () => {
  it('segments large episode lists instead of rendering every button', () => {
    render(<AnimeEpisodeSelector episodes={episodes} selectedEpisode={1} watchedEpisodes={[1]} onSelect={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(50)
    fireEvent.change(screen.getByLabelText('Episode range'), { target: { value: '2' } })
    expect(screen.getAllByRole('button')).toHaveLength(20)
    expect(screen.getByRole('button', { name: 'Episode 120' })).not.toBeNull()
  })
  it('marks current and watched episodes and selects an episode', () => {
    const onSelect = vi.fn()
    render(<AnimeEpisodeSelector episodes={episodes.slice(0, 3)} selectedEpisode={2} watchedEpisodes={[1]} onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: 'Episode 2' }).getAttribute('aria-current')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Episode 3' }))
    expect(onSelect).toHaveBeenCalledWith(3)
  })
})
