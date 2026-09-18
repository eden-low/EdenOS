import { combineLocalDateTime } from '../lib/date'
import type { FitnessScreenshotCandidate } from '../types/fitnessScreenshot'

export interface FitnessExtractionResponse {
  activity: string | null
  durationSeconds: number | null
  distanceMetres: number | null
  workoutDate: string | null
  workoutTime: string | null
  reportedActiveCaloriesKcal: number | null
  reportedTotalCaloriesKcal: number | null
  reportedAverageHeartRateBpm: number | null
  reportedSteps: number | null
  stepsScope: 'workout' | 'daily' | 'unclear' | 'none'
  metricsSource: 'Apple Fitness' | 'Apple Health' | 'Fitness screenshot'
  multipleWorkouts: boolean
  uncertain: boolean
}

function optionalInteger(value: unknown, min: number): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= min)
}

export function isFitnessExtractionResponse(value: unknown): value is FitnessExtractionResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (v.activity === null || (typeof v.activity === 'string' && v.activity.trim().length <= 80)) &&
    optionalInteger(v.durationSeconds, 1) && optionalInteger(v.distanceMetres, 1) &&
    (v.workoutDate === null || (typeof v.workoutDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.workoutDate))) &&
    (v.workoutTime === null || (typeof v.workoutTime === 'string' && /^\d{2}:\d{2}$/.test(v.workoutTime))) &&
    optionalInteger(v.reportedActiveCaloriesKcal, 0) && optionalInteger(v.reportedTotalCaloriesKcal, 0) &&
    optionalInteger(v.reportedAverageHeartRateBpm, 1) && optionalInteger(v.reportedSteps, 0) &&
    ['workout', 'daily', 'unclear', 'none'].includes(v.stepsScope as string) &&
    ['Apple Fitness', 'Apple Health', 'Fitness screenshot'].includes(v.metricsSource as string) &&
    typeof v.multipleWorkouts === 'boolean' && typeof v.uncertain === 'boolean'
}

function canonicalActivity(value: string | null): { activity?: string; recognized: boolean } {
  const text = value?.trim() ?? ''
  if (!text) return { recognized: false }
  if (/^(?:running|outdoor run|indoor run|treadmill running|run)$/i.test(text)) return { activity: 'Running', recognized: true }
  if (/^badminton$/i.test(text)) return { activity: 'Badminton', recognized: true }
  if (/^(?:gym|strength training|traditional strength training|functional strength training)$/i.test(text)) {
    return { activity: 'Gym', recognized: true }
  }
  return { activity: text, recognized: false }
}

export function fitnessExtractionToCandidate(value: unknown): FitnessScreenshotCandidate | null {
  if (!isFitnessExtractionResponse(value)) return null
  const mapped = canonicalActivity(value.activity)
  const occurredAt = value.workoutDate && value.workoutTime
    ? combineLocalDateTime(value.workoutDate, value.workoutTime) : null
  // A screenshot with multiple sessions must not silently choose one workout.
  if (value.multipleWorkouts) return {
    source: 'fitness_screenshot', needsEdit: true,
    issue: 'Multiple workouts appear in this image. Enter one session manually or choose a single-workout screenshot.',
  }
  const needsEdit = value.uncertain || !mapped.recognized || !value.durationSeconds || !occurredAt ||
    (value.reportedSteps !== null && value.stepsScope === 'unclear')
  return {
    source: 'fitness_screenshot',
    ...(mapped.activity ? { activity: mapped.activity } : {}),
    ...(value.durationSeconds !== null ? { durationSeconds: value.durationSeconds } : {}),
    ...(value.distanceMetres !== null ? { distanceMetres: value.distanceMetres } : {}),
    ...(occurredAt ? { occurredAt } : {}),
    ...(value.workoutDate ? { screenshotDate: value.workoutDate } : {}),
    ...(value.workoutTime ? { screenshotTime: value.workoutTime } : {}),
    ...(value.reportedActiveCaloriesKcal !== null ? { reportedActiveCaloriesKcal: value.reportedActiveCaloriesKcal } : {}),
    ...(value.reportedTotalCaloriesKcal !== null ? { reportedTotalCaloriesKcal: value.reportedTotalCaloriesKcal } : {}),
    ...(value.reportedAverageHeartRateBpm !== null ? { reportedAverageHeartRateBpm: value.reportedAverageHeartRateBpm } : {}),
    ...(value.reportedSteps !== null && value.stepsScope === 'workout' ? { reportedSteps: value.reportedSteps } : {}),
    metricsSource: value.metricsSource,
    needsEdit,
    ...(needsEdit ? { issue: 'Check the extracted fields, especially activity and workout date/time.' } : {}),
  }
}
