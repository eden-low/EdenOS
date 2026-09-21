import { describe, expect, it } from 'vitest'
import { calculateBmi, getBmiCategory } from './bmi'

describe('BMI', () => {
  it.each([
    [60, 170, 20.8, 'Healthy range'],
    [80, 170, 27.7, 'Overweight'],
    [90, 170, 31.1, 'Obesity'],
  ])('derives %s kg / %s cm as %s (%s)', (weight, height, expected, category) => {
    const bmi = calculateBmi(weight, height)
    expect(bmi).toBe(expected)
    expect(getBmiCategory(bmi!)).toBe(category)
  })

  it('does not calculate with a missing height or weight', () => {
    expect(calculateBmi(70, null)).toBeNull()
    expect(calculateBmi(null, 170)).toBeNull()
  })

  it.each([[18.49, 'Underweight'], [18.5, 'Healthy range'], [24.99, 'Healthy range'], [25, 'Overweight'], [29.99, 'Overweight'], [30, 'Obesity']])('classifies %s at adult boundary as %s', (bmi, category) => {
    expect(getBmiCategory(bmi as number)).toBe(category)
  })
})
