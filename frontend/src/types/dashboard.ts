export type MoneyInSen = number

export interface SavingsGoal {
  name: string
  allocatedSen: MoneyInSen
  targetSen: MoneyInSen
}

export interface MonthlyBudgetSummary {
  month: string
  budgetSen: MoneyInSen
  spentSen: MoneyInSen
  spentTodaySen: MoneyInSen
  suggestedRemainingTodaySen: MoneyInSen
}

export interface ExerciseActivity {
  name: string
  distanceMetres?: number
  durationSeconds: number
}

export interface ExerciseSummary {
  completedSessions: number
  targetSessions: number
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
  savingsGoal: SavingsGoal
  monthlyBudget: MonthlyBudgetSummary
  exercise: ExerciseSummary
  recentActivity: RecentActivityItem[]
  pendingDraftCount: number
}

export interface DashboardConfig {
  greeting: string
  monthlyBudgetSen: MoneyInSen
  weeklyExerciseTarget: number
  savingsGoal: SavingsGoal
}
