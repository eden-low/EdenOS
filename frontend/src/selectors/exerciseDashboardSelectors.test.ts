import { describe, expect, it } from 'vitest'
import { selectExerciseDashboard } from './exerciseDashboardSelectors'
import type { ExerciseRecord } from '../types/records'

const workout = (id: string, activity: string, durationSeconds: number, occurredAt: string, reported?: number, distanceMetres?: number): ExerciseRecord => ({ id, activity, durationSeconds, occurredAt, createdAt: occurredAt, updatedAt: occurredAt, source: 'manual', ...(reported === undefined ? {} : { reportedActiveCaloriesKcal: reported }), ...(distanceMetres === undefined ? {} : { distanceMetres }) })

describe('exercise dashboard selector', () => {
  it('keeps reported and estimated calories separate and groups activity by duration', () => {
    const result = selectExerciseDashboard([
      workout('reported', 'Badminton', 3600, '2026-09-16T08:00:00.000Z', 300),
      workout('estimated', 'Running', 1800, '2026-09-17T08:00:00.000Z'),
      workout('previous', 'Gym', 1800, '2026-09-09T08:00:00.000Z'),
    ], 70, new Date(2026, 8, 17, 12))
    expect(result.sessions).toBe(2)
    expect(result.durationSeconds).toBe(5400)
    expect(result.reportedCaloriesKcal).toBe(300)
    expect(result.estimatedCaloriesKcal).toBeGreaterThan(0)
    expect(result.activities[0]).toMatchObject({ activity: 'Badminton', durationSeconds: 3600 })
    expect(result.durationComparisonPercent).toBe(200)
    expect(result.dailyActivity.map((day) => day.sessions).reduce((sum, value) => sum + value, 0)).toBe(2)
  })

  it('derives consistency and personal bests only from supported workout data', () => {
    const result = selectExerciseDashboard([
      workout('today', 'Running', 1800, '2026-09-17T08:00:00.000Z', undefined, 5000),
      workout('yesterday', 'Running', 2400, '2026-09-16T08:00:00.000Z', undefined, 4000),
    ], null, new Date(2026, 8, 17, 12))
    expect(result.activeDays).toBe(2)
    expect(result.streakDays).toBe(2)
    expect(result.personalBests).toEqual(expect.arrayContaining([
      { label: 'Longest workout', value: 2400, unit: 'seconds' },
      { label: 'Longest distance', value: 5000, unit: 'metres' },
      { label: 'Fastest pace', value: 360, unit: 'secondsPerKm' },
    ]))
  })
})
