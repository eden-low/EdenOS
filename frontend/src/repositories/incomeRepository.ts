import type { IncomeData, IncomeRecord } from '../types/records'

export interface IncomeSubscriptionObserver {
  next: (incomes: IncomeRecord[]) => void
  error: (error: unknown) => void
}

export interface IncomeRepository {
  subscribeIncomes: (observer: IncomeSubscriptionObserver) => () => void
  createIncome: (id: string, data: IncomeData) => Promise<void>
  updateIncome: (id: string, data: IncomeData) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
}
