import { expenseCategoryLabels } from '../domain/expense'
import type { UserSettings } from '../domain/userSettings'
import type { ExpenseRecord } from '../types/records'

export interface ExpenseDashboardSummary {
  monthSpentSen: number
  previousMonthSpentSen: number
  monthComparisonPercent: number | null
  recordCount: number
  budgetSen: number | null
  budgetRemainingSen: number | null
  budgetProgress: number | null
  savingsGoalSen: number | null
  categories: Array<{ category: string; label: string; spentSen: number; percentage: number }>
  recent: ExpenseRecord[]
}

export function selectExpenseDashboard(expenses: ExpenseRecord[], settings: UserSettings, referenceDate: Date): ExpenseDashboardSummary {
  const currentStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const nextStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1)
  const previousStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
  const current = expenses.filter((item) => { const date = new Date(item.occurredAt); return date >= currentStart && date < nextStart })
  const previous = expenses.filter((item) => { const date = new Date(item.occurredAt); return date >= previousStart && date < currentStart })
  const monthSpentSen = current.reduce((total, item) => total + item.amountSen, 0)
  const previousMonthSpentSen = previous.reduce((total, item) => total + item.amountSen, 0)
  const grouped = new Map<string, number>()
  for (const item of current) grouped.set(item.category, (grouped.get(item.category) ?? 0) + item.amountSen)
  const categories = [...grouped.entries()].map(([category, spentSen]) => ({
    category, label: expenseCategoryLabels[category as keyof typeof expenseCategoryLabels], spentSen,
    percentage: monthSpentSen > 0 ? spentSen / monthSpentSen * 100 : 0,
  })).sort((left, right) => right.spentSen - left.spentSen)
  const budgetSen = settings.monthlyBudgetSen
  return {
    monthSpentSen,
    previousMonthSpentSen,
    monthComparisonPercent: previousMonthSpentSen > 0 ? Math.round((monthSpentSen - previousMonthSpentSen) / previousMonthSpentSen * 100) : null,
    recordCount: current.length,
    budgetSen,
    budgetRemainingSen: budgetSen === null ? null : budgetSen - monthSpentSen,
    budgetProgress: budgetSen === null ? null : Math.min(100, monthSpentSen / budgetSen * 100),
    savingsGoalSen: settings.savingsGoalSen,
    categories,
    recent: [...expenses].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5),
  }
}
