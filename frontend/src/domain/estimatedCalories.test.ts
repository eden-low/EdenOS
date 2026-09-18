import { describe, expect, it } from 'vitest'
import { calculateKilocalories, defaultIntensity, estimateExerciseCalories, intensityOptions, lookupMet } from './estimatedCalories'

describe('Estimated Calories', () => {
  it('uses the documented MET formula and rounds only for display', () => {
    expect(calculateKilocalories(5.5, 70, 30)).toBe(202.125)
    expect(estimateExerciseCalories({ activity: 'Badminton', durationSeconds: 1800 }, 70)).toEqual({
      status: 'estimated', kcal: 202.125, roundedKcal: 202, met: 5.5, code: '15030',
    })
  })

  it('rejects invalid inputs without manufacturing calories', () => {
    expect(calculateKilocalories(5.5, 70, 0)).toBeNull()
    expect(calculateKilocalories(5.5, Number.NaN, 30)).toBeNull()
    expect(estimateExerciseCalories({ activity: 'Running', durationSeconds: 0 }, 70).status).toBe('invalid-duration')
    expect(estimateExerciseCalories({ activity: 'Gym', durationSeconds: 1800 }, null).status).toBe('missing-weight')
    expect(estimateExerciseCalories({ activity: 'Walk', durationSeconds: 1800 }, 70).status).toBe('unsupported-activity')
  })

  it('uses only supported intensity combinations and explicit defaults', () => {
    expect(intensityOptions('Badminton')).toEqual(['moderate', 'vigorous'])
    expect(defaultIntensity('Badminton')).toBe('moderate')
    expect(lookupMet('Badminton', 'vigorous')).toEqual({ met: 7, code: '15020' })
    expect(lookupMet('Badminton', 'light')).toBeNull()
    expect(intensityOptions('Running')).toEqual(['vigorous'])
    expect(lookupMet('Running')).toEqual({ met: 10.5, code: '12145' })
    expect(lookupMet('Gym')).toEqual({ met: 5.5, code: '02060' })
    expect(lookupMet('Walk')).toBeNull()
  })
})
