import { describe, expect, it } from 'vitest'
import { drawTarotCard } from './drawTarotCard'
import { tarotDeck } from './tarotDeck'

function sequenceCrypto(sequence: number[]): Pick<Crypto, 'getRandomValues'> {
  let index = 0
  return { getRandomValues: ((values: Uint32Array) => {
    values[0] = sequence[index++ % sequence.length]
    return values
  }) as Crypto['getRandomValues'] }
}

describe('single-card draw', () => {
  it('returns a card in the deck and either orientation', () => {
    const reading = drawTarotCard(tarotDeck, sequenceCrypto([0, 1]))
    expect(reading.card).toBe(tarotDeck[0])
    expect(reading.orientation).toBe('reversed')
  })

  it('supports repeated draws from the full deck', () => {
    const source = sequenceCrypto([0, 0, 77, 1])
    expect(drawTarotCard(tarotDeck, source)).toMatchObject({ card: tarotDeck[0], orientation: 'upright' })
    expect(drawTarotCard(tarotDeck, source)).toMatchObject({ card: tarotDeck[77], orientation: 'reversed' })
  })

  it('rejects an empty deck and skips biased random values', () => {
    expect(() => drawTarotCard([], sequenceCrypto([0]))).toThrow(RangeError)
    const reading = drawTarotCard(tarotDeck, sequenceCrypto([0xffffffff, 1, 0]))
    expect(reading.card).toBe(tarotDeck[1])
  })
})
