import { describe, expect, it } from 'vitest'
import { selectExpenseDashboard } from './expenseDashboardSelectors'
import type { ExpenseRecord } from '../types/records'

const expense = (id: string, amountSen: number, occurredAt: string, category: ExpenseRecord['category'] = 'food'): ExpenseRecord => ({ id, amountSen, occurredAt, category, title: id, createdAt: occurredAt, updatedAt: occurredAt, source: 'manual' })

describe('expense dashboard selector', () => {
  it('calculates current month, comparison, budget, categories, and recent records', () => {
    const result = selectExpenseDashboard([
      expense('current-a', 3000, '2026-09-18T08:00:00.000Z'), expense('current-b', 2000, '2026-09-17T08:00:00.000Z', 'transport'), expense('previous', 4000, '2026-08-17T08:00:00.000Z'),
    ], { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: 10_000, savingsGoalSen: 50_000 }, new Date(2026, 8, 20, 12))
    expect(result.monthSpentSen).toBe(5000)
    expect(result.previousMonthSpentSen).toBe(4000)
    expect(result.monthComparisonPercent).toBe(25)
    expect(result.budgetRemainingSen).toBe(5000)
    expect(result.categories.map((item) => item.spentSen)).toEqual([3000, 2000])
    expect(result.recent).toHaveLength(3)
  })

  it('omits a fabricated comparison when no previous month data exists', () => {
    expect(selectExpenseDashboard([], { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: null, savingsGoalSen: null }, new Date(2026, 8, 20)).monthComparisonPercent).toBeNull()
  })
})
