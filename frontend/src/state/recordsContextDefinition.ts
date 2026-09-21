import { createContext } from 'react'
import type { ExpenseData, ExerciseData, IncomeData } from '../types/records'
import type { RecordsState } from './recordsReducer'

export interface RecordsContextValue extends RecordsState {
  retryExpenseSubscription: () => void
  retryExerciseSubscription: () => void
  discardDraft: (id: string) => void
  createExpenseDraft: (data: ExpenseData) => string
  updateExpenseDraft: (id: string, data: ExpenseData) => void
  confirmExpenseDraft: (id: string) => Promise<void>
  createExpense: (data: ExpenseData) => Promise<void>
  updateExpense: (id: string, data: ExpenseData) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  createIncome: (data: IncomeData) => Promise<void>
  updateIncome: (id: string, data: IncomeData) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  retryIncomeSubscription: () => void
  createExerciseDraft: (data: ExerciseData) => string
  updateExerciseDraft: (id: string, data: ExerciseData) => void
  confirmExerciseDraft: (id: string) => Promise<void>
  updateExercise: (id: string, data: ExerciseData) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
}

export const RecordsContext = createContext<RecordsContextValue | null>(null)
