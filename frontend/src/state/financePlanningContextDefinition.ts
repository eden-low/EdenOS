import { createContext } from 'react'
import type { FinanceBudget, FinanceBudgetData, FinanceGoal, FinanceGoalData } from '../types/finance'

export interface FinancePlanningContextValue {
  goals: FinanceGoal[]
  budgets: FinanceBudget[]
  status: 'loading' | 'loaded' | 'error'
  createGoal(data: FinanceGoalData, initialAllocationSen: number): Promise<void>
  updateGoal(goal: FinanceGoal, data: FinanceGoalData): Promise<void>
  setGoalArchived(goal: FinanceGoal, archived: boolean): Promise<void>
  contributeToGoal(goal: FinanceGoal, amountSen: number, occurredAt: Date): Promise<void>
  createBudget(data: FinanceBudgetData): Promise<void>
  updateBudget(budget: FinanceBudget, data: FinanceBudgetData): Promise<void>
  setBudgetArchived(budget: FinanceBudget, archived: boolean): Promise<void>
}

export const FinancePlanningContext = createContext<FinancePlanningContextValue | null>(null)
