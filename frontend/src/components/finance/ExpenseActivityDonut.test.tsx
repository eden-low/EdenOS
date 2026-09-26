import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { selectFinanceSummary } from '../../selectors/financeSelectors'
import type { ExpenseRecord } from '../../types/records'
import { ExpenseActivityDonut } from './ExpenseActivityDonut'

const date = '2026-09-10T12:00:00.000Z'
const settings = { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: null, savingsGoalSen: null }
const expense = (category: ExpenseRecord['category'], amountSen: number): ExpenseRecord => ({ id: category, title: category, category, amountSen, occurredAt: date, createdAt: date, updatedAt: date, source: 'manual' })

describe('ExpenseActivityDonut', () => {
  it('uses an intentional expense-only empty state', () => {
    render(<ExpenseActivityDonut summary={selectFinanceSummary([], [], settings, new Date(2026, 8, 1))} />)
    expect(screen.getByText('No expenses in September 2026')).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Expense categories/ })).toBeNull()
  })

  it('shows authoritative category amounts and groups only the visual long tail', () => {
    const categories: ExpenseRecord['category'][] = ['food', 'transport', 'shopping', 'entertainment', 'housing', 'health', 'education', 'other']
    const summary = selectFinanceSummary(categories.map((category, index) => expense(category, (8 - index) * 1_000)), [], settings, new Date(2026, 8, 1))
    render(<ExpenseActivityDonut summary={summary} />)
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByText('RM 80')).toBeTruthy()
    expect(screen.getByText('Other categories')).toBeTruthy()
    expect(summary.categories).toHaveLength(8)
  })
})
