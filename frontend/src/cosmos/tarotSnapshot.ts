import type { TarotSource } from './cosmosAiTypes'
import type { TarotSelection } from './tarotSelection'

export function tarotSnapshot(reading: TarotSelection[], mode: 'single' | 'three'): TarotSource {
  const positions = mode === 'single' ? ['单张牌 · Single Card'] : ['过去 · Past', '现在 · Present', '发展方向 · Future Direction']
  return {
    system: 'tarot', completeness: 'exact', conventions: ['78-card Rider–Waite–Smith symbolic deck; local shuffle and user-selected numeric positions.'], uncertainty: [],
    facts: { spread: mode === 'single' ? 'single' : 'three-card', cards: reading.map((selection, index) => ({
      position: positions[index], deckPosition: selection.position, cardId: selection.card.id,
      name: selection.card.name, englishName: selection.card.englishName, orientation: selection.orientation,
    })) },
  }
}
