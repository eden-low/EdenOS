import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { animeSummary } from '../../test/animeFixtures'
import { AnimeCard } from './AnimeCard'

describe('AnimeCard', () => {
  it('renders compact optional metadata and is keyboard-accessible', () => {
    const onOpen = vi.fn(); const anime = animeSummary()
    render(<AnimeCard anime={anime} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Sample Anime' }))
    expect(onOpen).toHaveBeenCalledWith(anime)
    expect(screen.getByText(/12 episodes/)).not.toBeNull()
  })
  it('falls back gracefully when the cover fails', () => {
    render(<AnimeCard anime={animeSummary()} onOpen={vi.fn()} />)
    fireEvent.error(screen.getByAltText('Sample Anime cover'))
    expect(screen.queryByAltText('Sample Anime cover')).toBeNull()
  })
})
