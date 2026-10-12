import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tarotDeck } from '../cosmos/tarotDeck'
import { CosmosPage } from './CosmosPage'

const tarotMocks = vi.hoisted(() => ({
  shuffle: vi.fn(),
  randomIndex: vi.fn(),
}))

vi.mock('../cosmos/tarotShuffle', () => ({ shuffleTarotDeck: tarotMocks.shuffle }))
vi.mock('../cosmos/tarotRandom', () => ({ browserRandomIndex: tarotMocks.randomIndex }))

function enterNumber(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })
}

describe('Cosmos interactive Tarot page', () => {
  beforeEach(() => {
    tarotMocks.shuffle.mockReset().mockReturnValue([...tarotDeck].reverse())
    tarotMocks.randomIndex.mockReset().mockReturnValue(0)
  })

  it('switches between Tarot, I Ching, and the keyboard-accessible BaZi tab', async () => {
    render(<CosmosPage />)
    expect(screen.getByRole('tab', { name: /塔罗/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: '洗牌、选择、揭示' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: /易经/ }))
    expect(screen.getByRole('tab', { name: /易经/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('heading', { name: '六次掷币，由下而上成卦' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: /易经/ }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /八字/ }).getAttribute('aria-selected')).toBe('true')
    expect(await screen.findByRole('heading', { name: '四柱、五行与十神' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: /八字/ }), { key: 'Home' })
    expect(screen.getByRole('tab', { name: /塔罗/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: /塔罗/ }))
    expect(screen.getByRole('button', { name: '洗牌 / Shuffle' })).toBeTruthy()
  })

  it('keeps one shuffled deck stable through single-card selection and restarts explicitly', () => {
    render(<CosmosPage />)
    expect(screen.getByRole('button', { name: /单张牌 Single Card/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('COSMOS')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    enterNumber(/Card number/, '17')
    expect(tarotMocks.shuffle).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
    expect(screen.getByText('牌堆位置 17 · 正位 · Upright')).toBeTruthy()
    expect(screen.getAllByText(tarotDeck[61].name).length).toBeGreaterThan(0)
    expect(screen.getByText(tarotDeck[61].upright)).toBeTruthy()
    expect(screen.getByText(/塔罗仅供文化探索/)).toBeTruthy()
    expect(tarotMocks.shuffle).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '新解读 / New Reading' }))
    expect(screen.getByRole('button', { name: '洗牌 / Shuffle' })).toBeTruthy()
    expect(screen.queryByText('牌堆位置 17 · 正位 · Upright')).toBeNull()
  })

  it('reshuffles only on request and clears pending number selections', () => {
    tarotMocks.shuffle
      .mockReturnValueOnce([...tarotDeck])
      .mockReturnValueOnce([...tarotDeck].reverse())
    render(<CosmosPage />)
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    enterNumber(/Card number/, '22')
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /Card number/ }).value).toBe('22')
    fireEvent.click(screen.getByRole('button', { name: '重新洗牌 / Reshuffle' }))
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: /Card number/ }).value).toBe('')
    expect(tarotMocks.shuffle).toHaveBeenCalledTimes(2)
  })

  it('validates three unique integer positions', () => {
    render(<CosmosPage />)
    fireEvent.click(screen.getByRole('button', { name: /三张牌 Three Cards/ }))
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    enterNumber(/Past/, '4')
    enterNumber(/Present/, '4')
    enterNumber(/Future Direction/, '12')
    fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
    expect(screen.getByRole('alert').textContent).toContain('三个不同的数字')
    enterNumber(/Present/, '1.5')
    fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
    expect(screen.getByRole('alert').textContent).toContain('整数')
    enterNumber(/Present/, '79')
    fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
    expect(screen.getByRole('alert').textContent).toContain('1 至 78')
  })

  it('reveals a three-card spread with independent orientations and a local combined reflection', () => {
    tarotMocks.shuffle.mockReturnValue([...tarotDeck])
    tarotMocks.randomIndex.mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(0)
    render(<CosmosPage />)
    fireEvent.click(screen.getByRole('button', { name: /三张牌 Three Cards/ }))
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    enterNumber(/Past/, '1')
    enterNumber(/Present/, '17')
    enterNumber(/Future Direction/, '78')
    fireEvent.click(screen.getByRole('button', { name: '揭示牌面 / Reveal' }))
    expect(screen.getByLabelText(/过去 · Past:.*正位/)).toBeTruthy()
    expect(screen.getByLabelText(/现在 · Present:.*逆位/)).toBeTruthy()
    expect(screen.getByLabelText(/发展方向 · Future Direction:.*正位/)).toBeTruthy()
    const reflection = screen.getByRole('region', { name: '把三张牌连成一条线索' })
    expect(reflection.textContent).toContain(tarotDeck[0].name)
    expect(reflection.textContent).toContain(tarotDeck[16].name)
    expect(reflection.textContent).toContain(tarotDeck[77].name)
    expect(reflection.textContent).toContain('不保证未来结果')
  })

  it('switching modes clears reading state and shuffle errors remain retryable', () => {
    tarotMocks.shuffle.mockImplementationOnce(() => { throw new Error('unavailable') }).mockReturnValueOnce([...tarotDeck])
    render(<CosmosPage />)
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    expect(screen.getByRole('alert').textContent).toContain('无法完成洗牌')
    fireEvent.click(screen.getByRole('button', { name: '洗牌 / Shuffle' }))
    enterNumber(/Card number/, '1')
    fireEvent.click(screen.getByRole('button', { name: /三张牌 Three Cards/ }))
    expect(screen.getByRole('button', { name: '洗牌 / Shuffle' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
