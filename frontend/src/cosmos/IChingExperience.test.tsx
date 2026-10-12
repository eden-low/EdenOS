import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IChingExperience } from './IChingExperience'
import { tossThreeCoins, type CoinToss, type IChingLineValue } from './ichingCoins'

vi.mock('./ichingCoins', async (importOriginal) => ({
  ...await importOriginal<typeof import('./ichingCoins')>(),
  tossThreeCoins: vi.fn(),
}))

const tossFor = (value: IChingLineValue): CoinToss => value === 6
  ? { coins: ['tails', 'tails', 'tails'], value }
  : value === 7
    ? { coins: ['heads', 'tails', 'tails'], value }
    : value === 8
      ? { coins: ['heads', 'heads', 'tails'], value }
      : { coins: ['heads', 'heads', 'heads'], value }

function start() {
  fireEvent.click(screen.getByRole('button', { name: '开始起卦 / Start Reading' }))
}

describe('I Ching three-coin experience', () => {
  beforeEach(() => vi.mocked(tossThreeCoins).mockReset())

  it('takes exactly six bottom-to-top tosses and reveals primary and relating hexagrams', () => {
    vi.mocked(tossThreeCoins).mockReturnValue(tossFor(9))
    render(<IChingExperience />)
    fireEvent.change(screen.getByRole('textbox', { name: /想带着什么问题/ }), { target: { value: 'What should I reflect on?' } })
    start()
    const tossButton = screen.getByRole('button', { name: '掷铜钱 / Toss Coins' })
    for (let index = 0; index < 6; index += 1) fireEvent.click(tossButton)
    expect(tossThreeCoins).toHaveBeenCalledTimes(6)
    expect(screen.queryByRole('button', { name: '掷铜钱 / Toss Coins' })).toBeNull()
    expect(screen.getByLabelText(/本卦.*第 1 卦 乾为天/)).toBeTruthy()
    expect(screen.getByLabelText(/变卦.*第 2 卦 坤为地/)).toBeTruthy()
    expect(screen.getByText('初爻、二爻、三爻、四爻、五爻、上爻')).toBeTruthy()
    expect(screen.getByText('“What should I reflect on?”')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '新解读 / New Reading' }))
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: /想带着什么问题/ }).value).toBe('')
    expect(screen.getByRole('button', { name: '开始起卦 / Start Reading' })).toBeTruthy()
  })

  it('shows unchanged relating state when no lines move', () => {
    vi.mocked(tossThreeCoins).mockReturnValue(tossFor(7))
    render(<IChingExperience />)
    start()
    for (let index = 0; index < 6; index += 1) fireEvent.click(screen.getByRole('button', { name: '掷铜钱 / Toss Coins' }))
    expect(screen.getByText('无动爻，变卦与本卦相同。')).toBeTruthy()
    expect(screen.getByText(/没有动爻，变卦与本卦相同/)).toBeTruthy()
  })

  it('resets tosses and the in-memory question midway', () => {
    vi.mocked(tossThreeCoins).mockReturnValue(tossFor(8))
    render(<IChingExperience />)
    fireEvent.change(screen.getByRole('textbox', { name: /想带着什么问题/ }), { target: { value: 'Temporary question' } })
    start()
    fireEvent.click(screen.getByRole('button', { name: '掷铜钱 / Toss Coins' }))
    expect(screen.getByText('1 / 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Reset/ }))
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: /想带着什么问题/ }).value).toBe('')
    expect(screen.getByRole('button', { name: '开始起卦 / Start Reading' })).toBeTruthy()
  })

  it('shows all eight trigrams in the compact local reference', () => {
    render(<IChingExperience />)
    expect(screen.getByRole('heading', { name: '三爻由下而上记录' })).toBeTruthy()
    for (const name of ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']) expect(screen.getByRole('heading', { name: new RegExp(`^${name}`) })).toBeTruthy()
  })
})
