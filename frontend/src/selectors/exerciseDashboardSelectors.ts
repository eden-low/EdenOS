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
  dailyActivity: Array<{ day: string; durationSeconds: number; sessions: number }>
  recent: ExerciseRecord[]
  activeDays: number
  streakDays: number
  personalBests: Array<{ label: string; value: number; unit: 'seconds' | 'metres' | 'secondsPerKm' }>
}

function localDayKey(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function activityStreak(records: ExerciseRecord[], referenceDate: Date): number {
  const days = new Set(records.map((record) => localDayKey(record.occurredAt)))
  const cursor = new Date(referenceDate); cursor.setHours(12, 0, 0, 0)
  if (!days.has(localDayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(localDayKey(cursor.toISOString()))) { streak += 1; cursor.setDate(cursor.getDate() - 1) }
  return streak
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
  const dailyActivity = Array.from({ length: 7 }, (_, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    durationSeconds: 0,
    sessions: 0,
  }))
  let reportedCaloriesKcal = 0
  let estimatedCaloriesKcal = 0
  for (const item of current) {
    grouped.set(item.activity, (grouped.get(item.activity) ?? 0) + item.durationSeconds)
    const dayIndex = (new Date(item.occurredAt).getDay() + 6) % 7
    if (dayIndex >= 0 && dayIndex < dailyActivity.length) {
      dailyActivity[dayIndex].durationSeconds += item.durationSeconds
      dailyActivity[dayIndex].sessions += 1
    }
    const reported = item.reportedActiveCaloriesKcal ?? item.reportedTotalCaloriesKcal
    if (reported !== undefined) reportedCaloriesKcal += reported
    else {
      const estimate = estimateExerciseCalories(item, bodyWeightKg)
      if (estimate.status === 'estimated') estimatedCaloriesKcal += estimate.roundedKcal
    }
  }
  const distanceRecords = records.filter((record) => record.distanceMetres && record.distanceMetres > 0)
  const paceRecords = distanceRecords.map((record) => ({ ...record, secondsPerKm: record.durationSeconds / (record.distanceMetres! / 1000) })).filter((record) => Number.isFinite(record.secondsPerKm))
  const longest = [...records].sort((left, right) => right.durationSeconds - left.durationSeconds)[0]
  const farthest = [...distanceRecords].sort((left, right) => (right.distanceMetres ?? 0) - (left.distanceMetres ?? 0))[0]
  const fastest = [...paceRecords].sort((left, right) => left.secondsPerKm - right.secondsPerKm)[0]
  return {
    sessions: current.length,
    durationSeconds,
    distanceMetres: current.reduce((total, item) => total + (item.distanceMetres ?? 0), 0),
    previousDurationSeconds,
    durationComparisonPercent: previousDurationSeconds > 0 ? Math.round((durationSeconds - previousDurationSeconds) / previousDurationSeconds * 100) : null,
    reportedCaloriesKcal,
    estimatedCaloriesKcal,
    activities: [...grouped.entries()].map(([activity, duration]) => ({ activity, durationSeconds: duration, percentage: durationSeconds > 0 ? duration / durationSeconds * 100 : 0 })).sort((a, b) => b.durationSeconds - a.durationSeconds),
    dailyActivity,
    recent: [...records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5),
    activeDays: new Set(current.map((record) => localDayKey(record.occurredAt))).size,
    streakDays: activityStreak(records, referenceDate),
    personalBests: [
      ...(longest ? [{ label: 'Longest workout', value: longest.durationSeconds, unit: 'seconds' as const }] : []),
      ...(farthest ? [{ label: 'Longest distance', value: farthest.distanceMetres!, unit: 'metres' as const }] : []),
      ...(fastest ? [{ label: 'Fastest pace', value: Math.round(fastest.secondsPerKm), unit: 'secondsPerKm' as const }] : []),
    ],
  }
}
