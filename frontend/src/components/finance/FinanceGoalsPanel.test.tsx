import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinancePlanningContext, type FinancePlanningContextValue } from '../../state/financePlanningContextDefinition'
import { FinanceGoalsPanel } from './FinanceGoalsPanel'

function value(overrides: Partial<FinancePlanningContextValue> = {}): FinancePlanningContextValue {
  return {
    goals: [], budgets: [], status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), setBudgetArchived: vi.fn(), ...overrides,
  }
}

describe('Finance goals management', () => {
  it('shows multiple goal progress and archives explicitly', () => {
    const context = value({ goals: [
      { id: 'phone', name: 'Phone', targetAmountSen: 500_000, allocatedAmountSen: 280_000, targetDate: null, status: 'active', createdAt: 1, updatedAt: 1, source: 'stored' },
      { id: 'emergency', name: 'Emergency Fund', targetAmountSen: 1_000_000, allocatedAmountSen: 650_000, targetDate: null, status: 'active', createdAt: 2, updatedAt: 2, source: 'stored' },
    ] })
    render(<FinancePlanningContext.Provider value={context}><FinanceGoalsPanel /></FinancePlanningContext.Provider>)
    expect(screen.getByText('Phone')).toBeTruthy(); expect(screen.getByText('Emergency Fund')).toBeTruthy()
    expect(screen.getByText('56% funded')).toBeTruthy(); expect(screen.getByText('65% funded')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0])
    expect(context.setGoalArchived).toHaveBeenCalledWith(context.goals[0], true)
  })

  it('records a reviewed allocation without creating an expense', async () => {
    const goal = { id: 'phone', name: 'Phone', targetAmountSen: 500_000, allocatedAmountSen: 280_000, targetDate: null, status: 'active' as const, createdAt: 1, updatedAt: 1, source: 'stored' as const }
    const context = value({ goals: [goal] })
    render(<FinancePlanningContext.Provider value={context}><FinanceGoalsPanel /></FinancePlanningContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Allocate' }))
    fireEvent.change(screen.getByLabelText('Amount (RM)'), { target: { value: '250.00' } })
    fireEvent.change(screen.getByLabelText('Allocation date'), { target: { value: '2026-09-26' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm allocation' }))
    await waitFor(() => expect(context.contributeToGoal).toHaveBeenCalledWith(goal, 25_000, expect.any(Date)))
  })

  it('uses an intentional empty state', () => {
    render(<FinancePlanningContext.Provider value={value()}><FinanceGoalsPanel /></FinancePlanningContext.Provider>)
    expect(screen.getByText(/No active goals/)).toBeTruthy()
  })

  it('creates a goal with an initial allocation as distinct planning data', async () => {
    const createGoal = vi.fn(async () => undefined); const context = value({ createGoal })
    render(<FinancePlanningContext.Provider value={context}><FinanceGoalsPanel /></FinancePlanningContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Add goal' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Car' } })
    fireEvent.change(screen.getByLabelText('Target amount (RM)'), { target: { value: '30000' } })
    fireEvent.change(screen.getByLabelText(/^Already saved \(RM, optional\)/), { target: { value: '12000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save goal' }))
    await waitFor(() => expect(createGoal).toHaveBeenCalledWith({ name: 'Car', targetAmountSen: 3_000_000, targetDate: null, status: 'active' }, 1_200_000))
  })
})
