import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { selectFinanceSummary } from '../../selectors/financeSelectors'
import type { FinanceGoal } from '../../types/finance'
import type { ExpenseRecord, IncomeRecord } from '../../types/records'
import { FinanceKpiGrid, GoalBudgetSummary, RecentTransactionsCard } from './FinanceDashboard'

const mock = vi.hoisted(() => ({ planning: { goals: [] as FinanceGoal[], budgets: [], status: 'loaded' as const } }))
vi.mock('../../state/useFinancePlanning', () => ({ useFinancePlanning: () => mock.planning }))

const at = (day: number) => `2026-09-${String(day).padStart(2, '0')}T12:00:00.000Z`
const expense = (id: string, amountSen: number, day: number, category: ExpenseRecord['category'] = 'food'): ExpenseRecord => ({ id, amountSen, category, title: id, occurredAt: at(day), createdAt: at(day), updatedAt: at(day), source: 'manual' })
const income = (id: string, amountSen: number, day: number): IncomeRecord => ({ id, amountSen, category: 'salary', description: id, occurredAt: at(day), createdAt: at(day), updatedAt: at(day) })
const settings = { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: 350_000, savingsGoalSen: null }

describe('Finance dashboard presentation', () => {
  beforeEach(() => { mock.planning = { goals: [], budgets: [], status: 'loaded' } })

  it('shows Available Money after allocations without changing Expenses or Net Cashflow', () => {
    const summary = selectFinanceSummary(
      [expense('Lunch', 210_000, 2)],
      [income('Salary', 600_000, 1)],
      settings,
      new Date(2026, 8, 1),
      { allocations: [{ id: 'allocation', goalId: 'phone', amountSen: 130_000, occurredAt: at(3), createdAt: 1 }] },
    )
    const { container } = render(<FinanceKpiGrid summary={summary} />)
    expect(container.querySelector('[data-finance-kpi="Available Money"]')?.textContent).toContain('RM 2,600')
    expect(container.querySelector('[data-finance-kpi="Available Money"]')?.textContent).toContain('After RM 1,300 goal allocations')
    expect(container.querySelector('[data-finance-kpi="Expenses"]')?.textContent).toContain('RM 2,100')
    expect(container.querySelector('[data-finance-kpi="Net Cashflow"]')?.textContent).toContain('RM 3,900')
  })

  it('handles zero income without invalid percentage language', () => {
    const summary = selectFinanceSummary([expense('Lunch', 1_800, 2)], [], settings, new Date(2026, 8, 1))
    const { container } = render(<FinanceKpiGrid summary={summary} />)
    expect(container.querySelector('[data-finance-kpi="Income"]')?.textContent).toContain('RM 0')
    expect(container.querySelector('[data-finance-kpi="Net Cashflow"]')?.textContent).toContain('Income minus actual expenses')
    expect(container.textContent).not.toContain('NaN')
  })

  it('renders deterministic previous-period differences', () => {
    const previous = { ...income('Old salary', 500_000, 1), occurredAt: '2026-08-01T12:00:00.000Z' }
    const summary = selectFinanceSummary([], [income('Salary', 600_000, 1), previous], settings, new Date(2026, 8, 1))
    const { container } = render(<FinanceKpiGrid summary={summary} />)
    expect(container.querySelector('[data-finance-kpi="Income"]')?.textContent).toContain('RM 1,000 higher than last month')
  })

  it('keeps combined Income and Expense transactions newest-first and bounded', () => {
    const summary = selectFinanceSummary([expense('Lunch', 1_850, 20), expense('Fuel', 5_000, 10)], [income('Salary', 600_000, 25)], settings, new Date(2026, 8, 1))
    const onSelect = vi.fn()
    render(<RecentTransactionsCard transactions={summary.transactions} monthLabel={summary.monthLabel} onSelect={onSelect} onViewAll={vi.fn()} />)
    const salary = screen.getByText('Salary'); const lunch = screen.getByText('Lunch')
    expect(salary.compareDocumentPosition(lunch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(lunch.closest('button')!)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ direction: 'expense', description: 'Lunch' }))
  })

  it('renders goal progress and signed budget overspending from planning summaries', () => {
    mock.planning = { goals: [{ id: 'phone', name: 'Phone', targetAmountSen: 500_000, allocatedAmountSen: 280_000, targetDate: null, status: 'active', createdAt: 1, updatedAt: 1, source: 'stored' }], budgets: [], status: 'loaded' }
    const budget = { id: 'food', name: 'Food', monthlyAmountSen: 100_000, category: 'food' as const, status: 'active' as const, createdAt: 1, updatedAt: 1 }
    const summary = selectFinanceSummary([expense('Lunch', 120_000, 2)], [], settings, new Date(2026, 8, 1), { budgets: [budget] })
    render(<GoalBudgetSummary summary={summary.budgetPlan} />)
    expect(screen.getByText('56%')).toBeTruthy()
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByTestId('budget-status-food').textContent).toContain('RM 200 overspent')
    expect(screen.getByTestId('overall-budget-status').textContent).toContain('RM 2,300 remaining')
  })
})
