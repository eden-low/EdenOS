import type { MoneyInSen } from './dashboard'

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

export interface ExerciseRecord {
  id: string
  activity: string
  distanceMetres: number
  durationMinutes: number
  occurredAt: string
  createdAt: string
  updatedAt: string
  source: 'manual'
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
export type RecordFilter = 'all' | 'expenses' | 'exercise'

export type TimelineRecord =
  | { kind: 'expense'; occurredAt: string; record: ExpenseRecord }
  | { kind: 'exercise'; occurredAt: string; record: ExerciseRecord }

export interface TimelineGroup {
  dateKey: string
  label: string
  records: TimelineRecord[]
}
