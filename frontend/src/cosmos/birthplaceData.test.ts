import { describe, expect, it } from 'vitest'
import { BIRTH_CITIES, TIME_ZONE_OPTIONS, searchBirthCities, searchTimeZones } from './birthplaceData'

describe('bundled offline birthplace data', () => {
  it('contains unique, auditable city records and prioritizes Malaysia', () => {
    expect(BIRTH_CITIES.length).toBeGreaterThanOrEqual(35)
    expect(new Set(BIRTH_CITIES.map(({ id }) => id)).size).toBe(BIRTH_CITIES.length)
    expect(new Set(BIRTH_CITIES.map(({ geonamesId }) => geonamesId)).size).toBe(BIRTH_CITIES.length)
    expect(BIRTH_CITIES.slice(0, 12).every(({ countryCode }) => countryCode === 'MY')).toBe(true)
  })

  it('stores verified Kuala Lumpur coordinates and timezone', () => {
    expect(BIRTH_CITIES.find(({ id }) => id === 'kuala-lumpur')).toMatchObject({ latitude: 3.1412, longitude: 101.68653, timeZone: 'Asia/Kuala_Lumpur', geonamesId: 1735161 })
  })

  it('stores an overseas city with its distinct IANA timezone', () => {
    expect(BIRTH_CITIES.find(({ id }) => id === 'new-york')).toMatchObject({ latitude: 40.71427, longitude: -74.00597, timeZone: 'America/New_York', geonamesId: 5128581 })
  })

  it('searches by English, Chinese, country, and accent-insensitive text', () => {
    expect(searchBirthCities('Kuala')[0].id).toBe('kuala-lumpur')
    expect(searchBirthCities('亚庇')[0].id).toBe('kota-kinabalu')
    expect(searchBirthCities('Canada').map(({ id }) => id)).toEqual(['toronto', 'vancouver'])
    expect(searchBirthCities('Sao Paulo')[0].id).toBe('sao-paulo')
    expect(searchBirthCities('not-a-city')).toEqual([])
  })

  it('provides readable searchable names for every bundled city timezone', () => {
    const optionIds = new Set(TIME_ZONE_OPTIONS.map(({ id }) => id))
    expect(BIRTH_CITIES.every(({ timeZone }) => optionIds.has(timeZone))).toBe(true)
    expect(searchTimeZones('Eastern').some(({ id }) => id === 'America/New_York')).toBe(true)
    expect(searchTimeZones('Asia/Tokyo')[0].name).toBe('Japan Time')
  })
})
