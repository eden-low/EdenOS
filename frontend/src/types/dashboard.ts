export type MoneyInSen = number

export interface MonthlySpendingSummary {
  month: string
  spentSen: MoneyInSen
  spentTodaySen: MoneyInSen
}

export interface ExerciseActivity {
  name: string
  distanceMetres?: number
  durationSeconds: number
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
  distanceMetres?: number
  durationSeconds: number
}

export type RecentActivityItem = FinanceActivity | RecentExerciseActivity

export interface DashboardSummary {
  greeting: string
  displayDate: string
  monthlySpending: MonthlySpendingSummary
  exercise: ExerciseSummary
  recentActivity: RecentActivityItem[]
}
