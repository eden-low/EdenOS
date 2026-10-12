import type { TarotCard } from './tarotDeck'
import { browserRandomIndex, type RandomIndex } from './tarotRandom'

export type TarotOrientation = 'upright' | 'reversed'
export type TarotSelection = {
  position: number
  card: TarotCard
  orientation: TarotOrientation
}

export type SelectionValidation =
  | { ok: true; positions: number[] }
  | { ok: false; error: string }

export function validateTarotPositions(
  values: readonly string[],
  requiredCount: number,
  deckLength: number,
): SelectionValidation {
  if (values.length !== requiredCount) return { ok: false, error: '选牌数量不正确，请重新输入。' }
  const normalized = values.map((value) => value.trim())
  if (normalized.some((value) => value === '')) return { ok: false, error: '请输入所有选牌数字。' }
  if (normalized.some((value) => !/^\d+$/.test(value))) return { ok: false, error: '请输入 1 至 78 之间的整数。' }
  const positions = normalized.map(Number)
  if (positions.some((position) => !Number.isSafeInteger(position) || position < 1 || position > deckLength)) {
    return { ok: false, error: `每个数字必须在 1 至 ${deckLength} 之间。` }
  }
  if (new Set(positions).size !== positions.length) return { ok: false, error: '三张牌需要三个不同的数字。' }
  return { ok: true, positions }
}

export function selectTarotCards(
  shuffledDeck: readonly TarotCard[],
  positions: readonly number[],
  randomIndex: RandomIndex = browserRandomIndex,
): TarotSelection[] {
  if (new Set(positions).size !== positions.length) throw new RangeError('Card positions must be unique')
  return positions.map((position) => {
    if (!Number.isSafeInteger(position) || position < 1 || position > shuffledDeck.length) throw new RangeError('Card position is outside the shuffled deck')
    const orientationIndex = randomIndex(2)
    if (orientationIndex !== 0 && orientationIndex !== 1) throw new RangeError('Orientation index is outside the requested range')
    return {
      position,
      card: shuffledDeck[position - 1],
      orientation: orientationIndex === 0 ? 'upright' : 'reversed',
    }
  })
}
