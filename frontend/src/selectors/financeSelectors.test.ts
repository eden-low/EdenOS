import { describe, expect, it } from 'vitest'
import type { ExpenseRecord, IncomeRecord } from '../types/records'
import { selectFinanceSummary } from './financeSelectors'

const at = (year: number, month: number, day: number) => new Date(year, month - 1, day, 12).toISOString()
const expense = (id: string, amountSen: number, date: string, category: ExpenseRecord['category'] = 'food'): ExpenseRecord => ({ id, amountSen, category, title: id, occurredAt: date, createdAt: date, updatedAt: date, source: 'manual' })
const income = (id: string, amountSen: number, date: string): IncomeRecord => ({ id, amountSen, category: 'salary', description: id, occurredAt: date, createdAt: date, updatedAt: date })
const settings = { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: 10_000, savingsGoalSen: 50_000 }

describe('finance calculations', () => {
  it('calculates mixed monthly income, expenses, and net cashflow in integer sen', () => {
    const summary = selectFinanceSummary(
      [expense('food', 2_500, at(2026, 9, 3)), expense('transport', 1_000, at(2026, 9, 4), 'transport')],
      [income('salary', 25_000, at(2026, 9, 1)), income('old', 99_000, at(2026, 8, 1))],
      settings,
      new Date(2026, 8, 1),
    )
    expect(summary).toMatchObject({ monthlyIncomeSen: 25_000, monthlyExpensesSen: 3_500, netCashflowSen: 21_500 })
    expect(summary.transactions.map((item) => item.direction).sort()).toEqual(['expense', 'expense', 'income'])
  })

  it('keeps budget usage expense-only', () => {
    const summary = selectFinanceSummary([expense('expense', 4_000, at(2026, 9, 3))], [income('income', 900_000, at(2026, 9, 3))], settings, new Date(2026, 8, 1))
    expect(summary.budgetRemainingSen).toBe(6_000)
    expect(summary.budgetProgress).toBe(40)
  })

  it('returns an intentional zero-data month', () => {
    const summary = selectFinanceSummary([], [], settings, new Date(2026, 8, 1))
    expect(summary).toMatchObject({ monthlyIncomeSen: 0, monthlyExpensesSen: 0, netCashflowSen: 0, categories: [], transactions: [], hasPreviousData: false })
    expect(summary.cashflow).toHaveLength(30)
    expect(summary.cashflow.every((point) => point.incomeSen === 0 && point.expenseSen === 0)).toBe(true)
  })

  it('provides prior-month totals only from real records', () => {
    const summary = selectFinanceSummary([expense('old', 2_000, at(2026, 8, 10))], [income('old-income', 5_000, at(2026, 8, 2))], settings, new Date(2026, 8, 1))
    expect(summary).toMatchObject({ previousIncomeSen: 5_000, previousExpensesSen: 2_000, previousNetCashflowSen: 3_000, hasPreviousData: true })
  })

  it('builds expense-only category percentages', () => {
    const summary = selectFinanceSummary([expense('food', 3_000, at(2026, 9, 2)), expense('ride', 1_000, at(2026, 9, 2), 'transport')], [income('salary', 100_000, at(2026, 9, 2))], settings, new Date(2026, 8, 1))
    expect(summary.categories).toEqual([
      expect.objectContaining({ category: 'food', percentage: 75 }),
      expect.objectContaining({ category: 'transport', percentage: 25 }),
    ])
  })
})
