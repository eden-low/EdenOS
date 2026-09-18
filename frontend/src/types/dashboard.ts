export type MoneyInSen = number
import type { ExerciseIntensity } from '../domain/estimatedCalories'

export interface MonthlySpendingSummary {
  month: string
  spentSen: MoneyInSen
  spentTodaySen: MoneyInSen
}

export interface ExerciseActivity {
  name: string
  intensity?: ExerciseIntensity
  distanceMetres?: number
  durationSeconds: number
  reportedActiveCaloriesKcal?: number
  reportedTotalCaloriesKcal?: number
  metricsSource?: 'Apple Fitness' | 'Apple Health' | 'Fitness screenshot'
}

export interface ExerciseSummary {
  completedSessions: number
  latestActivity: ExerciseActivity | null
}

interface RecentActivityBase {
  id: string
  title: string
  occurredAt: string
}

export interface FinanceActivity extends RecentActivityBase {
  type: 'finance'
  category: string
  amountSen: MoneyInSen
}

export interface RecentExerciseActivity extends RecentActivityBase {
  type: 'exercise'
  intensity?: ExerciseIntensity
  distanceMetres?: number
  durationSeconds: number
  reportedActiveCaloriesKcal?: number
  reportedTotalCaloriesKcal?: number
  metricsSource?: 'Apple Fitness' | 'Apple Health' | 'Fitness screenshot'
}

export type RecentActivityItem = FinanceActivity | RecentExerciseActivity

export interface DashboardSummary {
  greeting: string
  displayDate: string
  monthlySpending: MonthlySpendingSummary
  exercise: ExerciseSummary
  recentActivity: RecentActivityItem[]
}
