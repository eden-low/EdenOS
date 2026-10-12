import { tarotDeck, type TarotCard } from './tarotDeck'
import { browserRandomIndex, type RandomIndex } from './tarotRandom'

export function shuffleTarotDeck(
  deck: readonly TarotCard[] = tarotDeck,
  randomIndex: RandomIndex = browserRandomIndex,
): TarotCard[] {
  const shuffled = [...deck]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1)
    if (!Number.isSafeInteger(swapIndex) || swapIndex < 0 || swapIndex > index) throw new RangeError('Random index is outside the requested range')
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}
