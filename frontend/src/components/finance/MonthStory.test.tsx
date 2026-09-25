import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { emptyUserSettings } from '../../domain/userSettings'
import { selectFinanceSummary } from '../../selectors/financeSelectors'
import { MonthStory } from './MonthStory'

describe('Month Story allocation semantics', () => {
  it('labels allocations separately and reports available money without changing net cashflow', () => {
    const summary = selectFinanceSummary(
      [{ id: 'expense', amountSen: 210_000, category: 'food', title: 'Spending', source: 'manual', occurredAt: '2026-09-02T00:00:00.000Z', createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' }],
      [{ id: 'income', amountSen: 600_000, category: 'salary', description: 'Salary', occurredAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }],
      emptyUserSettings,
      new Date(2026, 8, 1),
      { allocations: [{ id: 'allocation', goalId: 'goal', amountSen: 130_000, occurredAt: '2026-09-03T00:00:00.000Z', createdAt: 1 }] },
    )
    render(<MonthStory summary={summary} />)
    expect(screen.getByText('Goal allocations')).toBeTruthy()
    expect(screen.getByText('Reserved this month, not an expense')).toBeTruthy()
    expect(screen.getByText('Income minus actual expenses')).toBeTruthy()
    expect(screen.getByText('Income minus spending and goal allocations')).toBeTruthy()
    expect(screen.getByText('RM 2,600')).toBeTruthy()
  })
})
