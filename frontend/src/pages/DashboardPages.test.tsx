import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'
import { ExpensesPage } from './ExpensesPage'
import { ExercisePage } from './ExercisePage'

vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../state/useUserSettings', () => ({ useUserSettings: vi.fn() }))

const retryExpenseSubscription = vi.fn()
const retryExerciseSubscription = vi.fn()

beforeEach(() => {
  vi.mocked(useLocalReferenceDate).mockReturnValue(new Date(2026, 8, 20, 12))
  vi.mocked(useUserSettings).mockReturnValue({ settings: { bodyWeightKg: 70, monthlyBudgetSen: 20_000, savingsGoalSen: 50_000 }, status: 'loaded' } as ReturnType<typeof useUserSettings>)
  vi.mocked(useRecords).mockReturnValue({
    expenses: [{ id: 'lunch', title: 'Lunch', category: 'food', amountSen: 2500, occurredAt: '2026-09-18T08:00:00.000Z', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z', source: 'manual' }],
    exerciseRecords: [{ id: 'run', activity: 'Running', durationSeconds: 1800, occurredAt: '2026-09-18T08:00:00.000Z', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z', source: 'manual', reportedActiveCaloriesKcal: 240 }],
    expenseStatus: 'loaded', expenseError: null, exerciseStatus: 'loaded', exerciseError: null,
    retryExpenseSubscription, retryExerciseSubscription,
  } as unknown as ReturnType<typeof useRecords>)
})

describe('dedicated dashboards', () => {
  it('shows authoritative expense summary, categories, recent activity, and Records navigation', () => {
    const openRecords = vi.fn(); render(<ExpensesPage onOpenRecords={openRecords} />)
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeTruthy()
    expect(screen.getAllByText('RM 25')[0]).toBeTruthy()
    expect(screen.getByText('Food')).toBeTruthy()
    expect(screen.getByText('Lunch')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'View Records' }))
    expect(openRecords).toHaveBeenCalledOnce()
  })

  it('keeps reported calories separate from estimates on Exercise', () => {
    render(<ExercisePage onOpenRecords={vi.fn()} />)
    expect(screen.getByText('Reported Calories')).toBeTruthy()
    expect(screen.getAllByText('240 kcal')[0]).toBeTruthy()
    expect(screen.getByText('MET Estimated Calories')).toBeTruthy()
    expect(screen.getByText(/Kept separate from device-reported values/)).toBeTruthy()
  })

  it('shows a scoped retry for an Expense subscription error', () => {
    vi.mocked(useRecords).mockReturnValue({ expenses: [], exerciseRecords: [], expenseStatus: 'error', expenseError: 'Permission denied', retryExpenseSubscription } as unknown as ReturnType<typeof useRecords>)
    render(<ExpensesPage onOpenRecords={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('Permission denied')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retryExpenseSubscription).toHaveBeenCalled()
  })
})
