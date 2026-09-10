import { createContext } from 'react'
import type { ExpenseData } from '../types/records'
import type { RecordsState } from './recordsReducer'

export interface RecordsContextValue extends RecordsState {
  createExpenseDraft: (data: ExpenseData) => string
  updateExpenseDraft: (id: string, data: ExpenseData) => void
  confirmExpenseDraft: (id: string) => Promise<void>
  updateExpense: (id: string, data: ExpenseData) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

export const RecordsContext = createContext<RecordsContextValue | null>(null)
