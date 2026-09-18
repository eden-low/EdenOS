import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExerciseCalories, WorkoutMetrics } from './ExerciseCalories'

const base = { activity: 'Running', durationSeconds: 1800, occurredAt: '2026-09-18T00:00:00.000Z', source: 'fitness_screenshot' as const }

describe('workout calorie semantics', () => {
  it('prefers source-reported active calories and labels the source', () => {
    render(<><ExerciseCalories exercise={{ ...base, metricsSource: 'Apple Fitness',
      reportedActiveCaloriesKcal: 382, reportedTotalCaloriesKcal: 431 }} />
      <WorkoutMetrics exercise={{ ...base, metricsSource: 'Apple Fitness',
        reportedActiveCaloriesKcal: 382, reportedTotalCaloriesKcal: 431, reportedSteps: 6000 }} /></>)
    expect(screen.getByText(/Active Calories · 382 kcal · Reported by Apple Fitness/)).toBeTruthy()
    expect(screen.getByText('431 kcal')).toBeTruthy()
    expect(screen.getByText('6000')).toBeTruthy()
    expect(screen.queryByText(/Estimated Calories/)).toBeNull()
  })

  it('uses total calories when active calories are absent', () => {
    render(<ExerciseCalories exercise={{ ...base, reportedTotalCaloriesKcal: 431 }} />)
    expect(screen.getByText(/Total Calories · 431 kcal/)).toBeTruthy()
  })
})
