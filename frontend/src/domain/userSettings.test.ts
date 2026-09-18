import { describe, expect, it } from 'vitest'
import { isValidBodyWeightKg, parseBodyWeightKg } from './userSettings'

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
