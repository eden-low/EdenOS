import { describe, expect, it } from 'vitest'
import { combinedTarotReflection } from './tarotReflection'
import { tarotDeck } from './tarotDeck'

describe('local combined tarot reflection', () => {
  it('references the actual cards and orientations without promising an outcome', () => {
    const reflection = combinedTarotReflection([
      { position: 1, card: tarotDeck[0], orientation: 'upright' },
      { position: 2, card: tarotDeck[1], orientation: 'reversed' },
      { position: 3, card: tarotDeck[2], orientation: 'upright' },
    ])
    expect(reflection).toContain(`「${tarotDeck[0].name} · 正位」`)
    expect(reflection).toContain(`「${tarotDeck[1].name} · 逆位」`)
    expect(reflection).toContain(`「${tarotDeck[2].name} · 正位」`)
    expect(reflection).toContain('不保证未来结果')
  })

  it('requires exactly three cards', () => {
    expect(() => combinedTarotReflection([])).toThrow(RangeError)
  })
})
