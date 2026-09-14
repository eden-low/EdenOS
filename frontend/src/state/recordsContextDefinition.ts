import { createContext } from 'react'
import type { ExpenseData, ExerciseData } from '../types/records'
import type { RecordsState } from './recordsReducer'

export interface RecordsContextValue extends RecordsState {
  createExpenseDraft: (data: ExpenseData) => string
  updateExpenseDraft: (id: string, data: ExpenseData) => void
  confirmExpenseDraft: (id: string) => Promise<void>
  updateExpense: (id: string, data: ExpenseData) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  createExerciseDraft: (data: ExerciseData) => string
  updateExerciseDraft: (id: string, data: ExerciseData) => void
  confirmExerciseDraft: (id: string) => Promise<void>
  updateExercise: (id: string, data: ExerciseData) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
}

export const RecordsContext = createContext<RecordsContextValue | null>(null)
