import { expenseCategoryLabels } from '../domain/expense'
import { incomeCategoryLabels } from '../domain/income'
import type { UserSettings } from '../domain/userSettings'
import type { ExpenseRecord, IncomeRecord } from '../types/records'

export interface FinanceTransaction {
  id: string
  direction: 'income' | 'expense'
  date: string
  description: string
  category: string
  amountSen: number
  sourceDomain: 'incomes' | 'expenses'
  record: IncomeRecord | ExpenseRecord
}

export interface CashflowPoint {
  day: number
  incomeSen: number
  expenseSen: number
}

export interface FinanceSummary {
  monthLabel: string
  monthInput: string
  monthlyIncomeSen: number
  monthlyExpensesSen: number
  netCashflowSen: number
  previousIncomeSen: number
  previousExpensesSen: number
  previousNetCashflowSen: number
  hasPreviousData: boolean
  budgetSen: number | null
  budgetRemainingSen: number | null
  budgetProgress: number | null
  savingsGoalSen: number | null
  categories: Array<{ category: string; label: string; spentSen: number; percentage: number }>
  transactions: FinanceTransaction[]
  cashflow: CashflowPoint[]
  savingsRatePercent: number | null
  expenseChangePercent: number | null
  largestCategory: { label: string; spentSen: number } | null
  mostChangedCategory: { label: string; changeSen: number } | null
  isOverspent: boolean
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function inMonth(iso: string, year: number, month: number): boolean {
  const date = new Date(iso)
  return date.getFullYear() === year && date.getMonth() === month
}

export function selectFinanceTransactions(
  expenses: ExpenseRecord[],
  incomes: IncomeRecord[],
): FinanceTransaction[] {
  return [
    ...expenses.map((record) => ({
      id: record.id,
      direction: 'expense' as const,
      date: record.occurredAt,
      description: record.title,
      category: expenseCategoryLabels[record.category],
      amountSen: record.amountSen,
      sourceDomain: 'expenses' as const,
      record,
    })),
    ...incomes.map((record) => ({
      id: record.id,
      direction: 'income' as const,
      date: record.occurredAt,
      description: record.description,
      category: incomeCategoryLabels[record.category],
      amountSen: record.amountSen,
      sourceDomain: 'incomes' as const,
      record,
    })),
  ].sort((left, right) => right.date.localeCompare(left.date))
}

export function selectFinanceSummary(
  expenses: ExpenseRecord[],
  incomes: IncomeRecord[],
  settings: UserSettings,
  selectedMonth: Date,
): FinanceSummary {
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()
  const previousDate = new Date(year, month - 1, 1)
  const currentExpenses = expenses.filter((record) => inMonth(record.occurredAt, year, month))
  const currentIncomes = incomes.filter((record) => inMonth(record.occurredAt, year, month))
  const previousExpenses = expenses.filter((record) => inMonth(record.occurredAt, previousDate.getFullYear(), previousDate.getMonth()))
  const previousIncomes = incomes.filter((record) => inMonth(record.occurredAt, previousDate.getFullYear(), previousDate.getMonth()))
  const monthlyExpensesSen = currentExpenses.reduce((sum, record) => sum + record.amountSen, 0)
  const monthlyIncomeSen = currentIncomes.reduce((sum, record) => sum + record.amountSen, 0)
  const previousExpensesSen = previousExpenses.reduce((sum, record) => sum + record.amountSen, 0)
  const previousIncomeSen = previousIncomes.reduce((sum, record) => sum + record.amountSen, 0)
  const grouped = new Map<string, number>()
  currentExpenses.forEach((record) => grouped.set(record.category, (grouped.get(record.category) ?? 0) + record.amountSen))
  const previousGrouped = new Map<string, number>()
  previousExpenses.forEach((record) => previousGrouped.set(record.category, (previousGrouped.get(record.category) ?? 0) + record.amountSen))
  const categories = [...grouped.entries()]
    .map(([category, spentSen]) => ({
      category,
      label: expenseCategoryLabels[category as keyof typeof expenseCategoryLabels],
      spentSen,
      percentage: monthlyExpensesSen > 0 ? spentSen / monthlyExpensesSen * 100 : 0,
    }))
    .sort((a, b) => b.spentSen - a.spentSen)
  const days = new Date(year, month + 1, 0).getDate()
  let cumulativeIncome = 0
  let cumulativeExpense = 0
  const cashflow = Array.from({ length: days }, (_, index) => {
    const day = index + 1
    cumulativeIncome += currentIncomes
      .filter((record) => new Date(record.occurredAt).getDate() === day)
      .reduce((sum, record) => sum + record.amountSen, 0)
    cumulativeExpense += currentExpenses
      .filter((record) => new Date(record.occurredAt).getDate() === day)
      .reduce((sum, record) => sum + record.amountSen, 0)
    return { day, incomeSen: cumulativeIncome, expenseSen: cumulativeExpense }
  })
  const budgetSen = settings.monthlyBudgetSen
  const categoryChanges = [...new Set([...grouped.keys(), ...previousGrouped.keys()])]
    .map((category) => ({
      label: expenseCategoryLabels[category as keyof typeof expenseCategoryLabels],
      changeSen: (grouped.get(category) ?? 0) - (previousGrouped.get(category) ?? 0),
    }))
    .sort((left, right) => Math.abs(right.changeSen) - Math.abs(left.changeSen))
  const netCashflowSen = monthlyIncomeSen - monthlyExpensesSen
  return {
    monthLabel: new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }).format(selectedMonth),
    monthInput: monthKey(selectedMonth),
    monthlyIncomeSen,
    monthlyExpensesSen,
    netCashflowSen,
    previousIncomeSen,
    previousExpensesSen,
    previousNetCashflowSen: previousIncomeSen - previousExpensesSen,
    hasPreviousData: previousExpenses.length + previousIncomes.length > 0,
    budgetSen,
    budgetRemainingSen: budgetSen === null ? null : budgetSen - monthlyExpensesSen,
    budgetProgress: budgetSen === null ? null : Math.min(100, monthlyExpensesSen / budgetSen * 100),
    savingsGoalSen: settings.savingsGoalSen,
    categories,
    transactions: selectFinanceTransactions(currentExpenses, currentIncomes),
    cashflow,
    savingsRatePercent: monthlyIncomeSen > 0 ? netCashflowSen / monthlyIncomeSen * 100 : null,
    expenseChangePercent: previousExpensesSen > 0 ? (monthlyExpensesSen - previousExpensesSen) / previousExpensesSen * 100 : null,
    largestCategory: categories[0] ? { label: categories[0].label, spentSen: categories[0].spentSen } : null,
    mostChangedCategory: categoryChanges[0] ?? null,
    isOverspent: budgetSen !== null && monthlyExpensesSen > budgetSen,
  }
}
