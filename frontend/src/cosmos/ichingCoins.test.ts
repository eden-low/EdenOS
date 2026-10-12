import { describe, expect, it, vi } from 'vitest'
import { lineValueFromCoins, tossThreeCoins, type CoinOutcome } from './ichingCoins'

describe('traditional three-coin mechanics', () => {
  it.each([
    [['tails', 'tails', 'tails'], 6],
    [['heads', 'tails', 'tails'], 7],
    [['heads', 'heads', 'tails'], 8],
    [['heads', 'heads', 'heads'], 9],
  ] as const)('converts %j to line value %i', (coins, value) => {
    expect(lineValueFromCoins(coins)).toBe(value)
  })

  it('produces the traditional 1:3:3:1 distribution from eight fair coin combinations', () => {
    const counts = new Map<number, number>()
    for (let mask = 0; mask < 8; mask += 1) {
      const coins = [0, 1, 2].map((bit) => mask & (1 << bit) ? 'heads' : 'tails') as [CoinOutcome, CoinOutcome, CoinOutcome]
      const value = lineValueFromCoins(coins)
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    expect(Object.fromEntries(counts)).toEqual({ 6: 1, 7: 3, 8: 3, 9: 1 })
  })

  it('requests three independent fair outcomes and supports injected randomness', () => {
    const values = [1, 0, 1]
    const randomIndex = vi.fn(() => values.shift() ?? 0)
    expect(tossThreeCoins(randomIndex)).toEqual({ coins: ['heads', 'tails', 'heads'], value: 8 })
    expect(randomIndex).toHaveBeenCalledTimes(3)
    expect(randomIndex).toHaveBeenNthCalledWith(1, 2)
  })

  it('rejects an invalid injected coin index', () => {
    expect(() => tossThreeCoins(() => 2)).toThrow(RangeError)
  })
})
