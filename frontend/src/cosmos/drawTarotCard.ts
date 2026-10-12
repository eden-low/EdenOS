import { tarotDeck, type TarotCard } from './tarotDeck'
import { secureRandomIndex, type CryptoRandomSource } from './tarotRandom'

export type TarotReading = { card: TarotCard; orientation: 'upright' | 'reversed' }

export function drawTarotCard(
  deck: readonly TarotCard[] = tarotDeck,
  cryptoSource: CryptoRandomSource = crypto,
): TarotReading {
  const card = deck[secureRandomIndex(deck.length, cryptoSource)]
  return { card, orientation: secureRandomIndex(2, cryptoSource) === 0 ? 'upright' : 'reversed' }
}
