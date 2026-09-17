import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useRecords } from '../state/useRecords'
import type { ExpenseRecord, ExerciseRecord } from '../types/records'
import { WeeklyReviewPage } from './WeeklyReviewPage'

vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))

const at = (day: number) => new Date(2026, 8, day, 12).toISOString()
const currentExpense: ExpenseRecord = {
  id: 'current-expense', amountSen: 1250, category: 'food', title: 'Lunch',
  occurredAt: at(17), createdAt: at(17), updatedAt: at(17), source: 'manual',
}
const previousExpense: ExpenseRecord = {
  id: 'previous-expense', amountSen: 700, category: 'transport', title: 'Grab',
  occurredAt: at(10), createdAt: at(10), updatedAt: at(10), source: 'manual',
}
const currentExercise: ExerciseRecord = {
  id: 'current-exercise', activity: 'Walk', durationSeconds: 1800,
  occurredAt: at(17), createdAt: at(17), updatedAt: at(17), source: 'manual',
}
const retryExpenseSubscription = vi.fn()
const retryExerciseSubscription = vi.fn()

function provideRecords(overrides: Record<string, unknown> = {}) {
  vi.mocked(useRecords).mockReturnValue({
    expenses: [currentExpense, previousExpense],
    exerciseRecords: [currentExercise],
    expenseStatus: 'loaded',
    expenseError: null,
    exerciseStatus: 'loaded',
    exerciseError: null,
    retryExpenseSubscription,
    retryExerciseSubscription,
    ...overrides,
  } as unknown as ReturnType<typeof useRecords>)
}

beforeEach(() => {
  vi.mocked(useLocalReferenceDate).mockReturnValue(new Date(2026, 8, 17, 12))
  retryExpenseSubscription.mockClear()
  retryExerciseSubscription.mockClear()
  provideRecords()
})

describe('Weekly Review page', () => {
  it('shows the selected week from trusted records and navigates to the previous week', () => {
    render(<WeeklyReviewPage />)
    expect(screen.getByRole('heading', { name: 'Weekly Review' })).toBeTruthy()
    expect(screen.getByText('Sep 14, 2026 – Sep 20, 2026')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Weekly expenses' })).getByText('RM 12.50', { selector: 'p' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Weekly exercise sessions' })).getByText('Walk')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(screen.getByText('Sep 7, 2026 – Sep 13, 2026')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Weekly expenses' })).getByText('RM 7', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText('No exercise recorded this week.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'This week' }))
    expect(screen.getByText('Sep 14, 2026 – Sep 20, 2026')).toBeTruthy()
  })

  it('keeps an Expense failure separate from healthy Exercise records', () => {
    provideRecords({ expenseStatus: 'error', expenseError: 'Expense records are temporarily unavailable.' })
    render(<WeeklyReviewPage />)

    const expenseRegion = screen.getByRole('region', { name: 'Weekly expenses' })
    expect(within(expenseRegion).getByRole('alert').textContent).toContain('Expense records unavailable')
    expect(within(expenseRegion).queryByText('RM 0')).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Weekly exercise sessions' })).getByText('Walk')).toBeTruthy()
    fireEvent.click(within(expenseRegion).getByRole('button', { name: 'Retry' }))
    expect(retryExpenseSubscription).toHaveBeenCalledOnce()
    expect(retryExerciseSubscription).not.toHaveBeenCalled()
  })

  it('keeps an Exercise failure separate from healthy Expense records', () => {
    provideRecords({ exerciseStatus: 'error', exerciseError: 'Exercise records are temporarily unavailable.' })
    render(<WeeklyReviewPage />)

    expect(within(screen.getByRole('region', { name: 'Weekly expenses' }))
      .getByText('RM 12.50', { selector: 'p' })).toBeTruthy()
    const exerciseRegion = screen.getByRole('region', { name: 'Weekly exercise sessions' })
    expect(within(exerciseRegion).getByRole('alert').textContent).toContain('Exercise records unavailable')
    expect(within(exerciseRegion).queryByText('0 sessions')).toBeNull()
    fireEvent.click(within(exerciseRegion).getByRole('button', { name: 'Retry' }))
    expect(retryExerciseSubscription).toHaveBeenCalledOnce()
    expect(retryExpenseSubscription).not.toHaveBeenCalled()
  })

  it('shows loaded-empty as a real empty week', () => {
    provideRecords({ expenses: [], exerciseRecords: [] })
    render(<WeeklyReviewPage />)
    expect(screen.getByText('No expenses recorded this week.')).toBeTruthy()
    expect(screen.getByText('No exercise recorded this week.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
