import { browserRandomIndex, type RandomIndex } from './tarotRandom'

export type CoinOutcome = 'heads' | 'tails'
export type IChingLineValue = 6 | 7 | 8 | 9

export type CoinToss = {
  coins: readonly [CoinOutcome, CoinOutcome, CoinOutcome]
  value: IChingLineValue
}

export function lineValueFromCoins(coins: readonly [CoinOutcome, CoinOutcome, CoinOutcome]): IChingLineValue {
  return coins.reduce<number>((sum, coin) => sum + (coin === 'heads' ? 3 : 2), 0) as IChingLineValue
}

export function tossThreeCoins(randomIndex: RandomIndex = browserRandomIndex): CoinToss {
  const coins = Array.from({ length: 3 }, () => {
    const outcome = randomIndex(2)
    if (outcome !== 0 && outcome !== 1) throw new RangeError('Coin random index is outside the requested range')
    return outcome === 0 ? 'tails' : 'heads'
  }) as [CoinOutcome, CoinOutcome, CoinOutcome]
  return { coins, value: lineValueFromCoins(coins) }
}

export function isMovingLine(value: IChingLineValue): boolean {
  return value === 6 || value === 9
}

export function isYangLine(value: IChingLineValue): boolean {
  return value === 7 || value === 9
}

export function isRelatingYangLine(value: IChingLineValue): boolean {
  return value === 6 || value === 7
}

export function lineValueName(value: IChingLineValue): string {
  return value === 6 ? '老阴 · Old Yin' : value === 7 ? '少阳 · Young Yang' : value === 8 ? '少阴 · Young Yin' : '老阳 · Old Yang'
}
