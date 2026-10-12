import { describe, expect, it } from 'vitest'
import { tarotDeck } from './tarotDeck'

describe('local tarot deck', () => {
  it('contains 78 unique cards with the traditional arcana and suits', () => {
    expect(tarotDeck).toHaveLength(78)
    expect(new Set(tarotDeck.map((card) => card.id)).size).toBe(78)
    expect(tarotDeck.filter((card) => card.arcana === 'major')).toHaveLength(22)
    expect(tarotDeck.filter((card) => card.arcana === 'minor')).toHaveLength(56)
    for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
      expect(tarotDeck.filter((card) => card.suit === suit)).toHaveLength(14)
    }
  })

  it('provides Chinese names and distinct upright and reversed interpretations for every card', () => {
    for (const card of tarotDeck) {
      expect(card.name).toMatch(/[\u3400-\u9fff]/)
      expect(card.englishName.trim()).not.toBe('')
      expect(card.upright.trim()).not.toBe('')
      expect(card.reversed.trim()).not.toBe('')
      expect(card.upright).not.toBe(card.reversed)
    }
  })
})
