import { describe, expect, it } from 'vitest'
import { fitnessExtractionToCandidate, isFitnessExtractionResponse, normalizeFitnessExtractionResponse, type FitnessExtractionResponse } from './fitnessScreenshot'

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

  it('discards an ambiguous relative date and opens a partial exercise for editing', () => {
    const normalized = normalizeFitnessExtractionResponse({ ...running, workoutDate: 'Today' })
    expect(normalized?.discardedFields).toEqual(['workoutDate'])
    expect(normalized?.response).toMatchObject({ workoutDate: null, uncertain: true })
    expect(fitnessExtractionToCandidate(normalized?.response)).toMatchObject({
      activity: 'Running', durationSeconds: 2760, needsEdit: true,
    })
  })

  it('discards invalid optional metrics without turning them into persisted numbers', () => {
    const normalized = normalizeFitnessExtractionResponse({ ...running,
      reportedActiveCaloriesKcal: '382 kcal', reportedAverageHeartRateBpm: -2,
      stepsScope: 'unknown',
    })
    expect(normalized?.discardedFields).toEqual([
      'reportedActiveCaloriesKcal', 'reportedAverageHeartRateBpm', 'stepsScope', 'reportedSteps',
    ])
    const candidate = fitnessExtractionToCandidate(normalized?.response)
    expect(candidate?.needsEdit).toBe(true)
    expect(candidate).not.toHaveProperty('reportedActiveCaloriesKcal')
    expect(candidate).not.toHaveProperty('reportedAverageHeartRateBpm')
    expect(candidate).not.toHaveProperty('reportedSteps')
  })

  it('rejects a response that omits the multiple-workout safety flag', () => {
    const { multipleWorkouts: _omitted, ...withoutSafetyFlag } = running
    expect(normalizeFitnessExtractionResponse(withoutSafetyFlag)).toBeNull()
  })

  it('rejects malformed structured responses and invalid numeric values', () => {
    expect(isFitnessExtractionResponse({ ...running, durationSeconds: '45 min' })).toBe(false)
    expect(isFitnessExtractionResponse({ ...running, reportedActiveCaloriesKcal: -1 })).toBe(false)
    expect(isFitnessExtractionResponse({ ...running, stepsScope: 'unknown' })).toBe(false)
    expect(fitnessExtractionToCandidate(null)).toBeNull()
  })
})
