import { describe, expect, it } from 'vitest'
import { selectExerciseDashboard } from './exerciseDashboardSelectors'
import type { ExerciseRecord } from '../types/records'

const workout = (id: string, activity: string, durationSeconds: number, occurredAt: string, reported?: number): ExerciseRecord => ({ id, activity, durationSeconds, occurredAt, createdAt: occurredAt, updatedAt: occurredAt, source: 'manual', ...(reported === undefined ? {} : { reportedActiveCaloriesKcal: reported }) })

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
  })
})
