import { describe, expect, it } from 'vitest'
import { emptyUserSettings } from './userSettings'
import { goalProgress, goalsWithLegacyCompatibility, LEGACY_SAVINGS_GOAL_ID, selectBudgetPlan, sumGoalAllocations } from './financePlanning'
import type { FinanceBudget, FinanceGoal, FinanceGoalAllocation } from '../types/finance'
import type { ExpenseRecord } from '../types/records'

const goal = (id: string, allocatedAmountSen: number, status: FinanceGoal['status'] = 'active'): FinanceGoal => ({ id, name: id, targetAmountSen: 10_000, allocatedAmountSen, targetDate: null, status, createdAt: 1, updatedAt: 1, source: 'stored' })
const budget = (id: string, amount: number, category: FinanceBudget['category'], status: FinanceBudget['status'] = 'active'): FinanceBudget => ({ id, name: id, monthlyAmountSen: amount, category, status, createdAt: 1, updatedAt: 1 })
const expense = (id: string, amountSen: number, category: ExpenseRecord['category']): ExpenseRecord => ({ id, amountSen, category, title: id, occurredAt: '2026-09-10T00:00:00.000Z', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z', source: 'manual' })

describe('multi-goal and multi-budget planning', () => {
  it('keeps multiple goals and caps visual progress without changing the saved amount', () => {
    const goals = [goal('Phone', 5_000), goal('Emergency', 12_000), goal('Archived', 2_000, 'archived')]
    expect(goals.filter((item) => item.status === 'active')).toHaveLength(2)
    expect(goalProgress(goals[0])).toBe(50)
    expect(goalProgress(goals[1])).toBe(100)
    expect(goals[1].allocatedAmountSen).toBe(12_000)
  })

  it('surfaces a legacy target until its deterministic goal has been materialized', () => {
    const settings = { ...emptyUserSettings, savingsGoalSen: 50_000 }
    expect(goalsWithLegacyCompatibility([], settings)).toEqual([expect.objectContaining({ id: LEGACY_SAVINGS_GOAL_ID, targetAmountSen: 50_000, source: 'legacy' })])
    expect(goalsWithLegacyCompatibility([goal(LEGACY_SAVINGS_GOAL_ID, 2_000)], settings)).toHaveLength(1)
    expect(goalsWithLegacyCompatibility([], emptyUserSettings)).toEqual([])
  })

  it('derives category spending, signed remaining, overspending, and unallocated budget', () => {
    const result = selectBudgetPlan(
      [budget('Food', 10_000, 'food'), budget('Fun', 3_000, 'entertainment'), budget('Plan only', 2_000, null), budget('Old', 5_000, 'food', 'archived')],
      [expense('lunch', 12_500, 'food'), expense('movie', 1_000, 'entertainment')],
      20_000,
    )
    expect(result).toMatchObject({ allocatedBudgetSen: 15_000, unallocatedBudgetSen: 5_000, spentSen: 13_500, remainingSen: 6_500, isOverspent: false })
    expect(result.active[0]).toMatchObject({ spentSen: 12_500, remainingSen: -2_500, overspentSen: 2_500, isOverspent: true })
    expect(result.active[2]).toMatchObject({ spentSen: null, remainingSen: null })
    expect(result.archived).toHaveLength(1)
  })

  it('uses pots as the total when there is no overall limit and never counts archived pots', () => {
    const result = selectBudgetPlan([budget('Food', 10_000, 'food'), budget('Old', 9_000, 'food', 'archived')], [], null)
    expect(result).toMatchObject({ totalBudgetSen: 10_000, allocatedBudgetSen: 10_000, unallocatedBudgetSen: null, remainingSen: null })
  })

  it('sums allocations independently of expenses', () => {
    const allocations: FinanceGoalAllocation[] = [
      { id: 'one', goalId: 'Phone', amountSen: 5_000, occurredAt: '2026-09-01T00:00:00.000Z', createdAt: 1 },
      { id: 'two', goalId: 'Emergency', amountSen: 8_000, occurredAt: '2026-09-02T00:00:00.000Z', createdAt: 2 },
    ]
    expect(sumGoalAllocations(allocations)).toBe(13_000)
  })
})
