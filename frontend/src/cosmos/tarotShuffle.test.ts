import { describe, expect, it } from 'vitest'
import { tarotDeck } from './tarotDeck'
import { shuffleTarotDeck } from './tarotShuffle'

function seededRandomIndex(seed: number) {
  let state = seed >>> 0
  return (maximum: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state % maximum
  }
}

describe('tarot deck shuffle', () => {
  it('preserves all 78 unique cards without mutating the source deck', () => {
    const original = [...tarotDeck]
    const shuffled = shuffleTarotDeck(tarotDeck, seededRandomIndex(42))
    expect(shuffled).toHaveLength(78)
    expect(new Set(shuffled.map((card) => card.id))).toEqual(new Set(tarotDeck.map((card) => card.id)))
    expect(tarotDeck).toEqual(original)
    expect(shuffled).not.toEqual(original)
  })

  it('produces a valid permutation on repeated shuffles', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const shuffled = shuffleTarotDeck(tarotDeck, seededRandomIndex(seed))
      expect(new Set(shuffled.map((card) => card.id)).size).toBe(78)
    }
  })

  it('allows the same number to identify different cards after another shuffle', () => {
    const first = shuffleTarotDeck(tarotDeck, () => 0)
    const second = shuffleTarotDeck(tarotDeck, (maximum) => maximum - 1)
    expect(first[16]).not.toBe(second[16])
  })

  it('rejects an injected index outside the requested Fisher–Yates range', () => {
    expect(() => shuffleTarotDeck(tarotDeck, (maximum) => maximum)).toThrow(RangeError)
  })
})
