import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { selectBudgetPlan } from '../../domain/financePlanning'
import { FinancePlanningContext, type FinancePlanningContextValue } from '../../state/financePlanningContextDefinition'
import type { ExpenseRecord } from '../../types/records'
import { FinanceBudgetsPanel } from './FinanceBudgetsPanel'

vi.mock('../dashboard/MoneySettingsDialog', () => ({ MoneySettingsDialog: () => <button>Overall limit</button> }))

describe('Finance budget pots management', () => {
  it('shows category spending, signed remaining, and archive controls', () => {
    const budgets = [
      { id: 'food', name: 'Food', monthlyAmountSen: 10_000, category: 'food' as const, status: 'active' as const, createdAt: 1, updatedAt: 1 },
      { id: 'other', name: 'Other plans', monthlyAmountSen: 5_000, category: null, status: 'active' as const, createdAt: 2, updatedAt: 2 },
    ]
    const expenses: ExpenseRecord[] = [{ id: 'lunch', amountSen: 12_500, category: 'food', title: 'Lunch', source: 'manual', occurredAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }]
    const setBudgetArchived = vi.fn()
    const context: FinancePlanningContextValue = { goals: [], budgets, status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), setBudgetArchived }
    render(<FinancePlanningContext.Provider value={context}><FinanceBudgetsPanel summary={selectBudgetPlan(budgets, expenses, 20_000)} /></FinancePlanningContext.Provider>)
    expect(screen.getByText('-RM 25')).toBeTruthy()
    expect(screen.getByText('Planning-only · no category linked')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(setBudgetArchived).toHaveBeenCalledWith(budgets[0], true)
  })

  it('keeps the overall-only default useful without requiring pots', () => {
    const context: FinancePlanningContextValue = { goals: [], budgets: [], status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), setBudgetArchived: vi.fn() }
    render(<FinancePlanningContext.Provider value={context}><FinanceBudgetsPanel summary={selectBudgetPlan([], [], 35_000)} /></FinancePlanningContext.Provider>)
    expect(screen.getByText(/No budget pots/)).toBeTruthy()
    expect(screen.getByText('Overall limit')).toBeTruthy()
  })

  it('creates a category-linked budget pot through explicit review', async () => {
    const createBudget = vi.fn(async () => undefined)
    const context: FinancePlanningContextValue = { goals: [], budgets: [], status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget, updateBudget: vi.fn(), setBudgetArchived: vi.fn() }
    render(<FinancePlanningContext.Provider value={context}><FinanceBudgetsPanel summary={selectBudgetPlan([], [], null)} /></FinancePlanningContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Add pot' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Food' } })
    fireEvent.change(screen.getByLabelText('Monthly amount (RM)'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Expense category (optional)'), { target: { value: 'food' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save budget' }))
    await waitFor(() => expect(createBudget).toHaveBeenCalledWith({ name: 'Food', monthlyAmountSen: 100_000, category: 'food', status: 'active' }))
  })
})
