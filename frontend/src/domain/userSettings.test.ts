import { describe, expect, it } from 'vitest'
import { isValidBodyWeightKg, isValidHeightCm, parseBodyWeightKg, parseHeightCm } from './userSettings'

describe('body weight', () => {
  it('accepts bounded kilograms to one decimal place', () => {
    expect(parseBodyWeightKg('70')).toBe(70)
    expect(parseBodyWeightKg(' 70.5 ')).toBe(70.5)
    expect(isValidBodyWeightKg(500)).toBe(true)
  })

  it('rejects garbage, missing, and implausible values', () => {
    for (const value of ['', 'abc', '70kg', '0', '19.9', '500.1', '70.55', 'Infinity']) {
      expect(parseBodyWeightKg(value)).toBeNull()
    }
  })
})

describe('height settings', () => {
  it('accepts realistic integer centimetres', () => {
    expect(parseHeightCm(' 175 ')).toBe(175)
    expect(isValidHeightCm(80)).toBe(true)
    expect(isValidHeightCm(250)).toBe(true)
  })

  it.each(['', '79', '251', '175.5', 'height'])('rejects invalid height %s', (value) => {
    expect(parseHeightCm(value)).toBeNull()
  })
})
