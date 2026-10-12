import { describe, expect, it } from 'vitest'
import { tarotDeck } from './tarotDeck'
import { selectTarotCards, validateTarotPositions } from './tarotSelection'

function sequenceRandomIndex(sequence: number[]) {
  let index = 0
  return () => sequence[index++ % sequence.length]
}

describe('number-based tarot selection', () => {
  it('maps one-based numbers to shuffled deck positions', () => {
    const shuffled = [...tarotDeck].reverse()
    const [selection] = selectTarotCards(shuffled, [17], () => 0)
    expect(selection).toEqual({ position: 17, card: shuffled[16], orientation: 'upright' })
  })

  it('selects three unique cards with independent orientations', () => {
    const selections = selectTarotCards(tarotDeck, [1, 17, 78], sequenceRandomIndex([0, 1, 0]))
    expect(selections.map(({ card }) => card)).toEqual([tarotDeck[0], tarotDeck[16], tarotDeck[77]])
    expect(selections.map(({ orientation }) => orientation)).toEqual(['upright', 'reversed', 'upright'])
    expect(new Set(selections.map(({ card }) => card.id)).size).toBe(3)
  })

  it('rejects empty, fractional, out-of-range, and duplicate entries', () => {
    expect(validateTarotPositions([''], 1, 78)).toMatchObject({ ok: false, error: '请输入所有选牌数字。' })
    expect(validateTarotPositions(['1.5'], 1, 78)).toMatchObject({ ok: false, error: '请输入 1 至 78 之间的整数。' })
    expect(validateTarotPositions(['0'], 1, 78)).toMatchObject({ ok: false, error: '每个数字必须在 1 至 78 之间。' })
    expect(validateTarotPositions(['79'], 1, 78)).toMatchObject({ ok: false, error: '每个数字必须在 1 至 78 之间。' })
    expect(validateTarotPositions(['4', '4', '12'], 3, 78)).toMatchObject({ ok: false, error: '三张牌需要三个不同的数字。' })
  })

  it('rejects invalid direct selections', () => {
    expect(() => selectTarotCards(tarotDeck, [1, 1], () => 0)).toThrow(RangeError)
    expect(() => selectTarotCards(tarotDeck, [79], () => 0)).toThrow(RangeError)
    expect(() => selectTarotCards(tarotDeck, [1], () => 2)).toThrow(RangeError)
  })
})
