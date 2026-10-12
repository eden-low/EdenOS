import { describe, expect, it } from 'vitest'
import { wholeSignHouseFor, wholeSignHouses } from './astrologyHouses'

describe('Whole Sign houses', () => {
  it('starts the first house at 0° of the Ascendant sign', () => {
    const houses = wholeSignHouses(58.4)
    expect(houses).toHaveLength(12)
    expect(houses[0]).toEqual({ number: 1, cuspLongitude: 30 })
    expect(houses[9]).toEqual({ number: 10, cuspLongitude: 300 })
  })

  it('assigns bodies to houses with wraparound', () => {
    expect(wholeSignHouseFor(31, 58)).toBe(1)
    expect(wholeSignHouseFor(359, 58)).toBe(11)
    expect(wholeSignHouseFor(5, 58)).toBe(12)
  })

  it('does not force MC into the tenth Whole Sign house', () => {
    expect(wholeSignHouseFor(260, 15)).toBe(9)
  })
})
