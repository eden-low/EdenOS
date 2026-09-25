import type { FinanceBudget, FinanceBudgetData, FinanceGoal, FinanceGoalAllocation, FinanceGoalData } from '../types/finance'

export interface FinancePlanningRepository {
  subscribeGoals(observer: { next: (goals: FinanceGoal[]) => void; error: (error: unknown) => void }): () => void
  subscribeBudgets(observer: { next: (budgets: FinanceBudget[]) => void; error: (error: unknown) => void }): () => void
  subscribeAllocations(start: Date, end: Date, observer: { next: (allocations: FinanceGoalAllocation[]) => void; error: (error: unknown) => void }): () => void
  createGoal(id: string, data: FinanceGoalData, initialAllocationSen: number): Promise<void>
  updateGoal(goal: FinanceGoal, data: FinanceGoalData): Promise<void>
  contribute(goal: FinanceGoal, amountSen: number, occurredAt: Date, allocationId: string): Promise<void>
  createBudget(id: string, data: FinanceBudgetData): Promise<void>
  updateBudget(id: string, data: FinanceBudgetData): Promise<void>
}
