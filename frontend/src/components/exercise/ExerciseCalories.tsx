import type { ExerciseData } from '../../types/records'
import { EstimatedCalories } from './EstimatedCalories'

export function ExerciseCalories({ exercise, compact = false }: {
  exercise: Pick<ExerciseData, 'activity' | 'durationSeconds'> & Partial<ExerciseData>
  compact?: boolean
}) {
  const active = exercise.reportedActiveCaloriesKcal
  const total = exercise.reportedTotalCaloriesKcal
  const value = active ?? total
  if (value === undefined) return <EstimatedCalories exercise={exercise} compact={compact} />
  return <p className="text-sm text-[var(--text-secondary)]">
    {active === undefined ? 'Total Calories' : 'Active Calories'} · {value} kcal
    {!compact && <> · Reported by {exercise.metricsSource ?? 'fitness screenshot'}</>}
  </p>
}

export function WorkoutMetrics({ exercise }: { exercise: ExerciseData }) {
  if (exercise.source !== 'fitness_screenshot') return null
  const hasMetrics = (exercise.reportedActiveCaloriesKcal !== undefined && exercise.reportedTotalCaloriesKcal !== undefined) ||
    exercise.reportedAverageHeartRateBpm !== undefined || exercise.reportedSteps !== undefined
  if (!hasMetrics) return null
  return <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
    {exercise.reportedActiveCaloriesKcal !== undefined && exercise.reportedTotalCaloriesKcal !== undefined &&
      <div><dt className="text-[var(--text-muted)]">Total Calories</dt><dd>{exercise.reportedTotalCaloriesKcal} kcal</dd></div>}
    {exercise.reportedAverageHeartRateBpm !== undefined &&
      <div><dt className="text-[var(--text-muted)]">Average Heart Rate</dt><dd>{exercise.reportedAverageHeartRateBpm} bpm</dd></div>}
    {exercise.reportedSteps !== undefined &&
      <div><dt className="text-[var(--text-muted)]">Workout Steps</dt><dd>{exercise.reportedSteps}</dd></div>}
  </dl>
}
