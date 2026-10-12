import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CosmosPage } from './CosmosPage'
import { drawTarotCard } from '../cosmos/drawTarotCard'
import { tarotDeck } from '../cosmos/tarotDeck'

vi.mock('../cosmos/drawTarotCard', () => ({ drawTarotCard: vi.fn() }))

describe('Cosmos Tarot page', () => {
  beforeEach(() => vi.mocked(drawTarotCard).mockReset())

  it('starts with a card back and reveals a local reading, then draws again', () => {
    vi.mocked(drawTarotCard)
      .mockReturnValueOnce({ card: tarotDeck[0], orientation: 'upright' })
      .mockReturnValueOnce({ card: tarotDeck[77], orientation: 'reversed' })
    render(<CosmosPage />)
    expect(screen.getByRole('heading', { name: /Cosmos/ })).toBeTruthy()
    expect(screen.getByText('COSMOS')).toBeTruthy()
    expect(screen.getByText(/塔罗仅供文化探索/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '抽一张牌' }))
    expect(screen.getByText(tarotDeck[0].upright)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '再抽一次' }))
    expect(screen.getByText(tarotDeck[77].reversed)).toBeTruthy()
    expect(drawTarotCard).toHaveBeenCalledTimes(2)
  })

  it('shows a retryable error when secure randomness is unavailable', () => {
    vi.mocked(drawTarotCard).mockImplementationOnce(() => { throw new Error('unavailable') })
      .mockReturnValueOnce({ card: tarotDeck[0], orientation: 'upright' })
    render(<CosmosPage />)
    fireEvent.click(screen.getByRole('button', { name: '抽一张牌' }))
    expect(screen.getByRole('alert').textContent).toContain('暂时无法抽牌')
    fireEvent.click(screen.getByRole('button', { name: '抽一张牌' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
