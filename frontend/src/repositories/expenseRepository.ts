import type { ExpenseData, ExpenseRecord } from '../types/records'

export interface ExpenseSubscriptionObserver {
  next: (expenses: ExpenseRecord[]) => void
  error: (error: unknown) => void
}

export interface ExpenseRepository {
  subscribeExpenses: (observer: ExpenseSubscriptionObserver) => () => void
  createExpense: (data: ExpenseData) => Promise<void>
  updateExpense: (id: string, data: ExpenseData) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}
