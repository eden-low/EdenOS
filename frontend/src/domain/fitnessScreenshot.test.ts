import { describe, expect, it } from 'vitest'
import { fitnessExtractionToCandidate, isFitnessExtractionResponse, type FitnessExtractionResponse } from './fitnessScreenshot'

const running: FitnessExtractionResponse = {
  activity: 'Outdoor Run', durationSeconds: 2760, distanceMetres: 5200,
  workoutDate: '2026-09-18', workoutTime: '07:30',
  reportedActiveCaloriesKcal: 382, reportedTotalCaloriesKcal: 431,
  reportedAverageHeartRateBpm: 148, reportedSteps: 6150,
  stepsScope: 'workout', metricsSource: 'Apple Fitness', multipleWorkouts: false, uncertain: false,
}

describe('fitness screenshot candidate boundary', () => {
  it('normalizes a complete running workout without treating reported calories as an estimate', () => {
    const candidate = fitnessExtractionToCandidate(running)
    expect(candidate).toMatchObject({ activity: 'Running', durationSeconds: 2760,
      distanceMetres: 5200, reportedActiveCaloriesKcal: 382,
      reportedTotalCaloriesKcal: 431, reportedAverageHeartRateBpm: 148,
      reportedSteps: 6150, metricsSource: 'Apple Fitness', needsEdit: false })
    expect(candidate?.occurredAt).toBeTruthy()
    expect(candidate).not.toHaveProperty('estimatedCalories')
  })

  it('maps Badminton and Strength Training to canonical activities', () => {
    expect(fitnessExtractionToCandidate({ ...running, activity: 'Badminton' })?.activity).toBe('Badminton')
    expect(fitnessExtractionToCandidate({ ...running, activity: 'Traditional Strength Training' })?.activity).toBe('Gym')
  })

  it('keeps an unknown activity editable', () => {
    expect(fitnessExtractionToCandidate({ ...running, activity: 'Rowing' })).toMatchObject({ activity: 'Rowing', needsEdit: true })
  })

  it('does not attach daily or unclear steps to a workout', () => {
    expect(fitnessExtractionToCandidate({ ...running, stepsScope: 'daily' })).not.toHaveProperty('reportedSteps')
    expect(fitnessExtractionToCandidate({ ...running, stepsScope: 'unclear' })).toMatchObject({ needsEdit: true })
    expect(fitnessExtractionToCandidate({ ...running, stepsScope: 'unclear' })).not.toHaveProperty('reportedSteps')
  })

  it('omits missing optional metrics without invented values', () => {
    const candidate = fitnessExtractionToCandidate({ ...running, distanceMetres: null,
      reportedActiveCaloriesKcal: null, reportedTotalCaloriesKcal: null,
      reportedAverageHeartRateBpm: null, reportedSteps: null })
    expect(candidate).not.toHaveProperty('reportedActiveCaloriesKcal')
    expect(candidate).not.toHaveProperty('distanceMetres')
  })

  it('requires review editing for ambiguous or absent date and multiple workouts', () => {
    expect(fitnessExtractionToCandidate({ ...running, workoutDate: null })?.needsEdit).toBe(true)
    expect(fitnessExtractionToCandidate({ ...running, uncertain: true })?.needsEdit).toBe(true)
    expect(fitnessExtractionToCandidate({ ...running, multipleWorkouts: true })).toMatchObject({
      source: 'fitness_screenshot', needsEdit: true,
    })
    expect(fitnessExtractionToCandidate({ ...running, multipleWorkouts: true })).not.toHaveProperty('activity')
  })

  it('rejects malformed structured responses and invalid numeric values', () => {
    expect(isFitnessExtractionResponse({ ...running, durationSeconds: '45 min' })).toBe(false)
    expect(isFitnessExtractionResponse({ ...running, reportedActiveCaloriesKcal: -1 })).toBe(false)
    expect(isFitnessExtractionResponse({ ...running, stepsScope: 'unknown' })).toBe(false)
    expect(fitnessExtractionToCandidate(null)).toBeNull()
  })
})
