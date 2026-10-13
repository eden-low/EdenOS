import type { NatalChart } from './astrologyAdapter'
import { zodiacForLongitude } from './astrologyData'
import type { AstrologySource, BirthSubject } from './cosmosAiTypes'

function angle(value: number | null): { sign: string; degree: number } | null {
  if (value === null) return null
  const placement = zodiacForLongitude(value)
  return { sign: placement.sign.id, degree: Number(placement.degree.toFixed(4)) }
}

export function astrologySnapshot(chart: NatalChart, subject: BirthSubject): AstrologySource & { subject: BirthSubject } {
  return {
    system: 'astrology', completeness: chart.kind === 'exact' ? 'exact' : 'partial',
    conventions: ['Tropical zodiac; apparent geocentric true-date ecliptic longitude; whole-sign houses when location and birth time are available.'],
    uncertainty: chart.kind === 'date-only' ? ['Birth time unknown; degrees, houses, angles, and aspects are unavailable; sign changes within the date remain explicit.'] :
      chart.ascendant === null ? ['Coordinates unavailable; Ascendant, MC, and houses omitted.'] : [],
    facts: {
      chartKind: chart.kind,
      placements: chart.placements.map((placement) => ({ planet: placement.id, sign: placement.sign,
        possibleSigns: 'possibleSigns' in placement ? [...placement.possibleSigns] : [placement.sign],
        degree: placement.degree === null ? null : Number(placement.degree.toFixed(4)), house: placement.house })),
      ascendant: angle(chart.ascendant), midheaven: angle(chart.midheaven),
      aspects: chart.aspects.map((aspect) => ({ first: aspect.first, second: aspect.second, type: aspect.type,
        separation: Number(aspect.separation.toFixed(4)), deviation: Number(aspect.deviation.toFixed(4)) })),
    },
    subject,
  }
}
