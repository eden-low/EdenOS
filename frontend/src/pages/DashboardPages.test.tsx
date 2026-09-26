import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'
import { ExpensesPage } from './ExpensesPage'
import { ExercisePage } from './ExercisePage'
import { PrivacyLockContext, unlockedPrivacyLock } from '../privacy/privacyLockContext'
import { useFinancePlanning } from '../state/useFinancePlanning'
import { useGoalAllocations } from '../state/useGoalAllocations'

vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../state/useUserSettings', () => ({ useUserSettings: vi.fn() }))
vi.mock('../state/useFinanceRules', () => ({ useFinanceRules: () => ({ rules: [], status: 'loaded', createRule: vi.fn(), setRuleEnabled: vi.fn(), deleteRule: vi.fn() }) }))
vi.mock('../state/useFinancePlanning', () => ({ useFinancePlanning: vi.fn() }))
vi.mock('../state/useGoalAllocations', () => ({ useGoalAllocations: vi.fn() }))

const retryExpenseSubscription = vi.fn()
const retryIncomeSubscription = vi.fn()
const retryExerciseSubscription = vi.fn()

beforeEach(() => {
  vi.mocked(useLocalReferenceDate).mockReturnValue(new Date(2026, 8, 20, 12))
  vi.mocked(useUserSettings).mockReturnValue({ settings: { bodyWeightKg: 70, heightCm: 175, monthlyBudgetSen: 20_000, savingsGoalSen: 50_000 }, status: 'loaded', saveBodyWeight: vi.fn(), saveHeight: vi.fn(), saveMonthlyBudget: vi.fn(), saveSavingsGoal: vi.fn() } as ReturnType<typeof useUserSettings>)
  vi.mocked(useFinancePlanning).mockReturnValue({ goals: [], budgets: [], status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), setBudgetArchived: vi.fn() })
  vi.mocked(useGoalAllocations).mockReturnValue({ allocations: [], status: 'loaded' })
  vi.mocked(useRecords).mockReturnValue({
    expenses: [{ id: 'lunch', title: 'Lunch', category: 'food', amountSen: 2500, occurredAt: '2026-09-18T08:00:00.000Z', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z', source: 'manual' }],
    incomes: [{ id: 'salary', description: 'Salary', category: 'salary', amountSen: 250000, occurredAt: '2026-09-18T08:00:00.000Z', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z' }],
    exerciseRecords: [{ id: 'run', activity: 'Running', durationSeconds: 1800, occurredAt: '2026-09-18T08:00:00.000Z', createdAt: '2026-09-18T08:00:00.000Z', updatedAt: '2026-09-18T08:00:00.000Z', source: 'manual', reportedActiveCaloriesKcal: 240 }],
    drafts: [], discardDraft: vi.fn(), createExpenseDraft: vi.fn(), updateExpenseDraft: vi.fn(), confirmExpenseDraft: vi.fn(), createExerciseDraft: vi.fn(), updateExerciseDraft: vi.fn(), confirmExerciseDraft: vi.fn(),
    expenseStatus: 'loaded', expenseError: null, incomeStatus: 'loaded', incomeError: null, exerciseStatus: 'loaded', exerciseError: null,
    retryExpenseSubscription, retryIncomeSubscription, retryExerciseSubscription,
  } as unknown as ReturnType<typeof useRecords>)
})

describe('dedicated dashboards', () => {
  it('shows authoritative expense summary, categories, recent activity, and Records navigation', () => {
    const openRecords = vi.fn(); render(<ExpensesPage onOpenRecords={openRecords} />)
    expect(screen.getByRole('heading', { name: 'Finance' })).toBeTruthy()
    expect(screen.getAllByText('RM 25')[0]).toBeTruthy()
    expect(screen.getAllByText('Food')[0]).toBeTruthy()
    expect(screen.getByText('Lunch')).toBeTruthy()
    expect(screen.getByText('Income and expenses')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Cumulative income and expense line chart' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'View all EdenOS records' }))
    expect(openRecords).toHaveBeenCalledOnce()
  })

  it('keeps reported calories separate from estimates on Exercise', () => {
    render(<ExercisePage onOpenRecords={vi.fn()} />)
    expect(screen.getByText('Calories')).toBeTruthy()
    expect(screen.getAllByText('240 kcal')[0]).toBeTruthy()
    expect(screen.getByText(/Reported and estimated stay separate|Estimated separately/)).toBeTruthy()
    expect(screen.getByText('Body Metrics')).toBeTruthy()
    expect(screen.getByText('22.9')).toBeTruthy()
  })

  it('shows a scoped retry for an Expense subscription error', () => {
    vi.mocked(useRecords).mockReturnValue({ expenses: [], incomes: [], exerciseRecords: [], expenseStatus: 'error', expenseError: 'Permission denied', incomeStatus: 'loaded', incomeError: null, retryExpenseSubscription, retryIncomeSubscription } as unknown as ReturnType<typeof useRecords>)
    render(<ExpensesPage onOpenRecords={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('Permission denied')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retryExpenseSubscription).toHaveBeenCalled()
  })

  it('masks Income, Expenses, Net Cashflow, chart values, and unified transaction amounts while locked', () => {
    render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, requestUnlock: vi.fn() }}><ExpensesPage onOpenRecords={vi.fn()} /></PrivacyLockContext.Provider>)
    expect(screen.getByText('Unlock to view finance trend')).toBeTruthy()
    expect(screen.queryByText('RM 2,500')).toBeNull()
    expect(screen.queryByText('RM 25')).toBeNull()
    expect(screen.queryByText('RM 2,475')).toBeNull()
    expect(screen.getAllByText(/RM/).length).toBeGreaterThan(3)
  })
})
