import { normalizeLongitude, type PlanetId } from './astrologyData'

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

export interface AspectDefinition {
  type: AspectType
  angle: number
  orb: number
  glyph: string
  chinese: string
  english: string
  symbolism: string
}

export interface Aspect {
  first: PlanetId
  second: PlanetId
  type: AspectType
  separation: number
  deviation: number
  definition: AspectDefinition
}

export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { type: 'conjunction', angle: 0, orb: 8, glyph: '☌', chinese: '合相', english: 'Conjunction', symbolism: '两种象征能量集中在相近方向。' },
  { type: 'sextile', angle: 60, orb: 5, glyph: '⚹', chinese: '六合', english: 'Sextile', symbolism: '传统上表示可被主动运用的协调机会。' },
  { type: 'square', angle: 90, orb: 7, glyph: '□', chinese: '四分相', english: 'Square', symbolism: '传统上表示需要调整与行动的张力。' },
  { type: 'trine', angle: 120, orb: 7, glyph: '△', chinese: '三分相', english: 'Trine', symbolism: '传统上表示较自然流动的关联。' },
  { type: 'opposition', angle: 180, orb: 8, glyph: '☍', chinese: '对分相', english: 'Opposition', symbolism: '传统上表示两端之间的觉察与平衡。' },
]

export function shortestAngularDistance(first: number, second: number): number {
  const distance = Math.abs(normalizeLongitude(first) - normalizeLongitude(second))
  return Math.min(distance, 360 - distance)
}

export function calculateAspects(placements: { id: PlanetId; longitude: number }[]): Aspect[] {
  const aspects: Aspect[] = []
  for (let firstIndex = 0; firstIndex < placements.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < placements.length; secondIndex += 1) {
      const first = placements[firstIndex]
      const second = placements[secondIndex]
      const separation = shortestAngularDistance(first.longitude, second.longitude)
      const definition = ASPECT_DEFINITIONS.find((candidate) => Math.abs(separation - candidate.angle) <= candidate.orb)
      if (definition) aspects.push({ first: first.id, second: second.id, type: definition.type, separation, deviation: Math.abs(separation - definition.angle), definition })
    }
  }
  return aspects
}
