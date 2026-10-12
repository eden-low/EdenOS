import { tarotDeck, type TarotCard } from './tarotDeck'

export type TarotReading = { card: TarotCard; orientation: 'upright' | 'reversed' }

function randomIndex(length: number, cryptoSource: Pick<Crypto, 'getRandomValues'>): number {
  if (!Number.isSafeInteger(length) || length < 1 || length > 0x100000000) throw new RangeError('Invalid deck size')
  const range = 0x100000000
  const ceiling = range - (range % length)
  const values = new Uint32Array(1)
  do { cryptoSource.getRandomValues(values) } while (values[0] >= ceiling)
  return values[0] % length
}

export function drawTarotCard(
  deck: readonly TarotCard[] = tarotDeck,
  cryptoSource: Pick<Crypto, 'getRandomValues'> = crypto,
): TarotReading {
  const card = deck[randomIndex(deck.length, cryptoSource)]
  return { card, orientation: randomIndex(2, cryptoSource) === 0 ? 'upright' : 'reversed' }
}
