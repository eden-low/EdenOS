import type { UserSettings } from './userSettings'
import type { ExpenseRecord } from '../types/records'
import type { FinanceBudget, FinanceGoal, FinanceGoalAllocation } from '../types/finance'

export const LEGACY_SAVINGS_GOAL_ID = 'legacy-savings-goal'

export function goalsWithLegacyCompatibility(goals: FinanceGoal[], settings: UserSettings): FinanceGoal[] {
  if (settings.savingsGoalSen === null || goals.some((goal) => goal.id === LEGACY_SAVINGS_GOAL_ID)) return goals
  return [...goals, {
    id: LEGACY_SAVINGS_GOAL_ID,
    name: 'Savings Goal',
    targetAmountSen: settings.savingsGoalSen,
    allocatedAmountSen: 0,
    targetDate: null,
    status: 'active',
    createdAt: 0,
    updatedAt: 0,
    source: 'legacy',
  }]
}

export function goalProgress(goal: FinanceGoal): number {
  return Math.min(100, goal.allocatedAmountSen / goal.targetAmountSen * 100)
}

export interface BudgetPotSummary {
  budget: FinanceBudget
  spentSen: number | null
  remainingSen: number | null
  overspentSen: number
  isOverspent: boolean
}

export interface BudgetPlanSummary {
  active: BudgetPotSummary[]
  archived: FinanceBudget[]
  totalBudgetSen: number | null
  allocatedBudgetSen: number
  unallocatedBudgetSen: number | null
  spentSen: number
  remainingSen: number | null
  isOverspent: boolean
}

export function selectBudgetPlan(
  budgets: FinanceBudget[],
  expenses: ExpenseRecord[],
  overallBudgetSen: number | null,
): BudgetPlanSummary {
  const activeBudgets = budgets.filter((budget) => budget.status === 'active')
  const spentSen = expenses.reduce((sum, expense) => sum + expense.amountSen, 0)
  const active = activeBudgets.map((budget) => {
    const categorySpent = budget.category === null
      ? null
      : expenses.filter((expense) => expense.category === budget.category).reduce((sum, expense) => sum + expense.amountSen, 0)
    const remainingSen = categorySpent === null ? null : budget.monthlyAmountSen - categorySpent
    return {
      budget,
      spentSen: categorySpent,
      remainingSen,
      overspentSen: remainingSen !== null && remainingSen < 0 ? -remainingSen : 0,
      isOverspent: remainingSen !== null && remainingSen < 0,
    }
  })
  const allocatedBudgetSen = activeBudgets.reduce((sum, budget) => sum + budget.monthlyAmountSen, 0)
  return {
    active,
    archived: budgets.filter((budget) => budget.status === 'archived'),
    totalBudgetSen: overallBudgetSen ?? (activeBudgets.length > 0 ? allocatedBudgetSen : null),
    allocatedBudgetSen,
    unallocatedBudgetSen: overallBudgetSen === null ? null : overallBudgetSen - allocatedBudgetSen,
    spentSen,
    remainingSen: overallBudgetSen === null ? null : overallBudgetSen - spentSen,
    isOverspent: overallBudgetSen !== null && spentSen > overallBudgetSen,
  }
}

export function sumGoalAllocations(allocations: FinanceGoalAllocation[]): number {
  return allocations.reduce((sum, allocation) => sum + allocation.amountSen, 0)
}
