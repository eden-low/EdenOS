import { estimateExerciseCalories } from '../domain/estimatedCalories'
import { addLocalWeeks, startOfLocalWeek } from '../lib/date'
import type { ExerciseRecord } from '../types/records'

export interface ExerciseDashboardSummary {
  sessions: number
  durationSeconds: number
  distanceMetres: number
  previousDurationSeconds: number
  durationComparisonPercent: number | null
  reportedCaloriesKcal: number
  estimatedCaloriesKcal: number
  activities: Array<{ activity: string; durationSeconds: number; percentage: number }>
  recent: ExerciseRecord[]
}

export function selectExerciseDashboard(records: ExerciseRecord[], bodyWeightKg: number | null, referenceDate: Date): ExerciseDashboardSummary {
  const weekStart = startOfLocalWeek(referenceDate)
  const nextWeek = addLocalWeeks(weekStart, 1)
  const previousWeek = addLocalWeeks(weekStart, -1)
  const current = records.filter((item) => { const date = new Date(item.occurredAt); return date >= weekStart && date < nextWeek })
  const previous = records.filter((item) => { const date = new Date(item.occurredAt); return date >= previousWeek && date < weekStart })
  const durationSeconds = current.reduce((total, item) => total + item.durationSeconds, 0)
  const previousDurationSeconds = previous.reduce((total, item) => total + item.durationSeconds, 0)
  const grouped = new Map<string, number>()
  let reportedCaloriesKcal = 0
  let estimatedCaloriesKcal = 0
  for (const item of current) {
    grouped.set(item.activity, (grouped.get(item.activity) ?? 0) + item.durationSeconds)
    const reported = item.reportedActiveCaloriesKcal ?? item.reportedTotalCaloriesKcal
    if (reported !== undefined) reportedCaloriesKcal += reported
    else {
      const estimate = estimateExerciseCalories(item, bodyWeightKg)
      if (estimate.status === 'estimated') estimatedCaloriesKcal += estimate.roundedKcal
    }
  }
  return {
    sessions: current.length,
    durationSeconds,
    distanceMetres: current.reduce((total, item) => total + (item.distanceMetres ?? 0), 0),
    previousDurationSeconds,
    durationComparisonPercent: previousDurationSeconds > 0 ? Math.round((durationSeconds - previousDurationSeconds) / previousDurationSeconds * 100) : null,
    reportedCaloriesKcal,
    estimatedCaloriesKcal,
    activities: [...grouped.entries()].map(([activity, duration]) => ({ activity, durationSeconds: duration, percentage: durationSeconds > 0 ? duration / durationSeconds * 100 : 0 })).sort((a, b) => b.durationSeconds - a.durationSeconds),
    recent: [...records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5),
  }
}
