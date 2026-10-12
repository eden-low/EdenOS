import { normalizeLongitude } from './astrologyData'

export interface WholeSignHouse {
  number: number
  cuspLongitude: number
}

export function wholeSignHouses(ascendant: number): WholeSignHouse[] {
  const firstCusp = Math.floor(normalizeLongitude(ascendant) / 30) * 30
  return Array.from({ length: 12 }, (_, index) => ({ number: index + 1, cuspLongitude: normalizeLongitude(firstCusp + index * 30) }))
}

export function wholeSignHouseFor(longitude: number, ascendant: number): number {
  const firstCusp = Math.floor(normalizeLongitude(ascendant) / 30) * 30
  return Math.floor(normalizeLongitude(longitude - firstCusp) / 30) + 1
}
