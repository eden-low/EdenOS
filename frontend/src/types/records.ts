import type { MoneyInSen } from './dashboard'
import type { ExerciseIntensity } from '../domain/estimatedCalories'
import type { AnimeProgress } from './anime'

export const expenseCategories = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'housing',
  'health',
  'education',
  'other',
] as const

export type ExpenseCategory = (typeof expenseCategories)[number]
export type ExpenseSource = 'manual' | 'text' | 'photo'
export const incomeCategories = [
  'salary',
  'freelance',
  'business',
  'investment',
  'gift',
  'refund',
  'other',
] as const

export type IncomeCategory = (typeof incomeCategories)[number]
export type DraftStatus = 'draft' | 'confirmed'

export interface ExpenseData {
  amountSen: MoneyInSen
  category: ExpenseCategory
  title: string
  note?: string
  occurredAt: string
  source: ExpenseSource
}

export interface ExpenseRecord extends ExpenseData {
  id: string
  createdAt: string
  updatedAt: string
}

export interface IncomeData {
  amountSen: MoneyInSen
  category: IncomeCategory
  description: string
  note?: string
  occurredAt: string
}

export interface IncomeRecord extends IncomeData {
  id: string
  createdAt: string
  updatedAt: string
}

export interface ExerciseData {
  activity: string
  intensity?: ExerciseIntensity
  distanceMetres?: number
  durationSeconds: number
  occurredAt: string
  source: 'manual' | 'text' | 'fitness_screenshot'
  metricsSource?: 'Apple Fitness' | 'Apple Health' | 'Fitness screenshot'
  reportedActiveCaloriesKcal?: number
  reportedTotalCaloriesKcal?: number
  reportedAverageHeartRateBpm?: number
  reportedSteps?: number
}

export interface ExerciseRecord extends ExerciseData {
  id: string
  createdAt: string
  updatedAt: string
}

export interface CaptureDraft<TKind extends string, TData> {
  id: string
  kind: TKind
  status: DraftStatus
  data: TData
  createdAt: string
  updatedAt: string
}

export type ExpenseDraft = CaptureDraft<'expense', ExpenseData>
export type ExerciseDraft = CaptureDraft<'exercise', ExerciseData>
export type RecordDraft = ExpenseDraft | ExerciseDraft
export type RecordFilter = 'all' | 'expenses' | 'income' | 'exercise' | 'anime'
export type RecordDomainStatus = 'loading' | 'loaded' | 'error'

export type TimelineRecord =
  | { kind: 'expense'; occurredAt: string; record: ExpenseRecord }
  | { kind: 'income'; occurredAt: string; record: IncomeRecord }
  | { kind: 'exercise'; occurredAt: string; record: ExerciseRecord }
  | { kind: 'anime'; occurredAt: string; record: AnimeProgress }

export interface TimelineGroup {
  dateKey: string
  label: string
  records: TimelineRecord[]
}
