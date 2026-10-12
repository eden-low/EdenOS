import { AstroTime, Body, Ecliptic, GeoVector, SiderealTime, e_tilt } from 'astronomy-engine'
import { calculateAspects, type Aspect } from './astrologyAspects'
import { wholeSignHouseFor, wholeSignHouses, type WholeSignHouse } from './astrologyHouses'
import { PLANETS, normalizeLongitude, zodiacForLongitude, type PlanetId, type ZodiacSignId } from './astrologyData'
import { utcRangeForLocalDate } from './astrologyTime'

export interface ExactPlanetPlacement {
  id: PlanetId
  longitude: number
  sign: ZodiacSignId
  degree: number
  house: number | null
}

export interface UncertainPlanetPlacement {
  id: PlanetId
  longitude: null
  sign: ZodiacSignId | null
  degree: null
  house: null
  possibleSigns: ZodiacSignId[]
}

export interface ExactNatalChart {
  kind: 'exact'
  utcIso: string
  placements: ExactPlanetPlacement[]
  ascendant: number | null
  midheaven: number | null
  houses: WholeSignHouse[]
  aspects: Aspect[]
}

export interface PartialNatalChart {
  kind: 'date-only'
  utcRange: { startIso: string; endIso: string }
  placements: UncertainPlanetPlacement[]
  ascendant: null
  midheaven: null
  houses: []
  aspects: []
}

export type NatalChart = ExactNatalChart | PartialNatalChart

const BODY_BY_PLANET: Record<PlanetId, Body> = {
  sun: Body.Sun, moon: Body.Moon, mercury: Body.Mercury, venus: Body.Venus, mars: Body.Mars,
  jupiter: Body.Jupiter, saturn: Body.Saturn, uranus: Body.Uranus, neptune: Body.Neptune, pluto: Body.Pluto,
}

export function geocentricTropicalLongitude(id: PlanetId, utcDate: Date): number {
  return normalizeLongitude(Ecliptic(GeoVector(BODY_BY_PLANET[id], utcDate, true)).elon)
}

export function calculateAngles(utcDate: Date, latitude: number, longitude: number): { ascendant: number; midheaven: number } {
  const time = new AstroTime(utcDate)
  const localSiderealRadians = normalizeLongitude(SiderealTime(time) * 15 + longitude) * Math.PI / 180
  const obliquityRadians = e_tilt(time).tobl * Math.PI / 180
  const latitudeRadians = latitude * Math.PI / 180
  const midheaven = normalizeLongitude(Math.atan2(Math.sin(localSiderealRadians), Math.cos(localSiderealRadians) * Math.cos(obliquityRadians)) * 180 / Math.PI)
  const ascendant = normalizeLongitude(Math.atan2(
    Math.cos(localSiderealRadians),
    -(Math.sin(localSiderealRadians) * Math.cos(obliquityRadians) + Math.tan(latitudeRadians) * Math.sin(obliquityRadians)),
  ) * 180 / Math.PI)
  return { ascendant, midheaven }
}

export function calculateExactNatal(utcMs: number, location?: { latitude: number; longitude: number }): ExactNatalChart {
  const utcDate = new Date(utcMs)
  const angles = location ? calculateAngles(utcDate, location.latitude, location.longitude) : null
  const placements = PLANETS.map(({ id }): ExactPlanetPlacement => {
    const longitude = geocentricTropicalLongitude(id, utcDate)
    const zodiac = zodiacForLongitude(longitude)
    return { id, longitude, sign: zodiac.sign.id, degree: zodiac.degree, house: angles ? wholeSignHouseFor(longitude, angles.ascendant) : null }
  })
  return {
    kind: 'exact', utcIso: utcDate.toISOString(), placements,
    ascendant: angles?.ascendant ?? null,
    midheaven: angles?.midheaven ?? null,
    houses: angles ? wholeSignHouses(angles.ascendant) : [],
    aspects: calculateAspects(placements),
  }
}

export function calculateDateOnlyNatal(date: string, timeZone: string): PartialNatalChart {
  const range = utcRangeForLocalDate(date, timeZone)
  if (!range) throw new Error('这个本地日期在所选时区不存在或无法解析。')
  const startDate = new Date(range.startMs)
  const endDate = new Date(range.endMs + 59_999)
  const placements = PLANETS.map(({ id }): UncertainPlanetPlacement => {
    const signs = new Set<ZodiacSignId>()
    for (let sampleMs = range.startMs; sampleMs <= range.endMs; sampleMs += 30 * 60_000) {
      signs.add(zodiacForLongitude(geocentricTropicalLongitude(id, new Date(sampleMs))).sign.id)
    }
    signs.add(zodiacForLongitude(geocentricTropicalLongitude(id, endDate)).sign.id)
    const possibleSigns = [...signs]
    return { id, longitude: null, sign: possibleSigns.length === 1 ? possibleSigns[0] : null, degree: null, house: null, possibleSigns }
  })
  return {
    kind: 'date-only', utcRange: { startIso: startDate.toISOString(), endIso: endDate.toISOString() }, placements,
    ascendant: null, midheaven: null, houses: [], aspects: [],
  }
}

export function calculateSunSignForDate(date: string, timeZone: string): ZodiacSignId[] {
  return calculateDateOnlyNatal(date, timeZone).placements.find(({ id }) => id === 'sun')?.possibleSigns ?? []
}
