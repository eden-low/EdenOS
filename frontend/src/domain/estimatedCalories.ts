import type { ExerciseData } from '../types/records'

export type ExerciseIntensity = 'light' | 'moderate' | 'vigorous'

// 2024 Adult Compendium of Physical Activities, https://pacompendium.com/adult-compendium/
// Badminton: https://pacompendium.com/sports/ (15030 social, 15020 competitive)
// Running: https://pacompendium.com/running/ (12145 self-selected pace)
// Gym: https://pacompendium.com/conditioning-exercise/ (02060 health club, general)
// The broad Running and Gym labels do not describe a pace or workout type, so V1
// uses one general entry rather than claiming a precise light/vigorous variant.
const activityMet = {
  Badminton: {
    defaultIntensity: 'moderate',
    variants: {
      moderate: { met: 5.5, code: '15030' },
      vigorous: { met: 7.0, code: '15020' },
    },
  },
  Running: {
    defaultIntensity: 'vigorous',
    variants: { vigorous: { met: 10.5, code: '12145' } },
  },
  Gym: {
    defaultIntensity: 'moderate',
    variants: { moderate: { met: 5.5, code: '02060' } },
  },
} as const

export function intensityOptions(activity: string): ExerciseIntensity[] {
  const entry = activityMet[activity.trim() as keyof typeof activityMet]
  return entry ? Object.keys(entry.variants) as ExerciseIntensity[] : []
}

export function defaultIntensity(activity: string): ExerciseIntensity | null {
  return activityMet[activity.trim() as keyof typeof activityMet]?.defaultIntensity ?? null
}

export function lookupMet(activity: string, intensity?: ExerciseIntensity) {
  const entry = activityMet[activity.trim() as keyof typeof activityMet]
  if (!entry) return null
  const selected = intensity ?? entry.defaultIntensity
  return (entry.variants as Partial<Record<ExerciseIntensity, { met: number; code: string }>>)[selected] ?? null
}

export function calculateKilocalories(met: number, bodyWeightKg: number, durationMinutes: number): number | null {
  if (!Number.isFinite(met) || met <= 0 || !Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0 ||
      !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null
  return met * 3.5 * bodyWeightKg / 200 * durationMinutes
}

export type CalorieEstimate =
  | { status: 'estimated'; kcal: number; roundedKcal: number; met: number; code: string }
  | { status: 'missing-weight' | 'unsupported-activity' | 'invalid-duration' | 'unsupported-intensity' }

export function estimateExerciseCalories(
  exercise: Pick<ExerciseData, 'activity' | 'durationSeconds' | 'intensity'>,
  bodyWeightKg: number | null,
): CalorieEstimate {
  if (!Number.isFinite(exercise.durationSeconds) || exercise.durationSeconds <= 0) return { status: 'invalid-duration' }
  const entry = activityMet[exercise.activity.trim() as keyof typeof activityMet]
  if (!entry) return { status: 'unsupported-activity' }
  const mapping = lookupMet(exercise.activity, exercise.intensity)
  if (!mapping) return { status: 'unsupported-intensity' }
  if (bodyWeightKg === null || !Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) return { status: 'missing-weight' }
  const kcal = calculateKilocalories(mapping.met, bodyWeightKg, exercise.durationSeconds / 60)
  if (kcal === null) return { status: 'invalid-duration' }
  return { status: 'estimated', kcal, roundedKcal: Math.round(kcal), met: mapping.met, code: mapping.code }
}
