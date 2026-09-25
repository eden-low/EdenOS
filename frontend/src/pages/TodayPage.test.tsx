import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'
import { TodayPage } from './TodayPage'
import { useFinancePlanning } from '../state/useFinancePlanning'
import { useGoalAllocations } from '../state/useGoalAllocations'

const animeRepository = vi.hoisted(() => ({ fetchPublishedSince: vi.fn(), countPublishedSince: vi.fn() }))
vi.mock('../repositories/firestoreAnimeRepository', () => ({ createFirestoreAnimeRepository: () => animeRepository }))
vi.mock('../state/useFirebaseAuth', () => ({ useFirebaseAuth: () => ({ firestore: {}, uid: 'dashboard-owner' }) }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../state/useUserSettings', () => ({ useUserSettings: vi.fn() }))
vi.mock('../state/useAnimeProgress', () => ({ useAnimeProgress: vi.fn() }))
vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../components/dashboard/DailyContext', () => ({ DailyContext: () => <div>Daily context</div> }))
vi.mock('../state/useFinancePlanning', () => ({ useFinancePlanning: vi.fn() }))
vi.mock('../state/useGoalAllocations', () => ({ useGoalAllocations: vi.fn() }))

describe('Today V2', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useLocalReferenceDate).mockReturnValue(new Date(2026, 8, 26, 12))
    vi.mocked(useUserSettings).mockReturnValue({ settings: { bodyWeightKg: null, heightCm: null, monthlyBudgetSen: 1_000, savingsGoalSen: 5_000 }, status: 'loaded' } as ReturnType<typeof useUserSettings>)
    vi.mocked(useFinancePlanning).mockReturnValue({ goals: [{ id: 'phone', name: 'Phone', targetAmountSen: 5_000, allocatedAmountSen: 2_800, targetDate: null, status: 'active', createdAt: 1, updatedAt: 1, source: 'stored' }], budgets: [], status: 'loaded', createGoal: vi.fn(), updateGoal: vi.fn(), setGoalArchived: vi.fn(), contributeToGoal: vi.fn(), createBudget: vi.fn(), updateBudget: vi.fn(), setBudgetArchived: vi.fn() })
    vi.mocked(useGoalAllocations).mockReturnValue({ allocations: [{ id: 'allocation', goalId: 'phone', amountSen: 500, occurredAt: '2026-09-25T00:00:00.000Z', createdAt: 1 }], status: 'loaded' })
    vi.mocked(useAnimeProgress).mockReturnValue({ items: [{ externalId: 'frieren', animeId: 'frieren', title: 'Frieren', currentEpisode: 4, positionSeconds: 0, durationSeconds: 0, watchedEpisodes: [1, 2, 3], trackingStatus: 'watching', updatedAt: 2 }], cloudError: null } as ReturnType<typeof useAnimeProgress>)
    vi.mocked(useRecords).mockReturnValue({
      expenses: [{ id: 'lunch', amountSen: 1_200, category: 'food', title: 'Lunch', occurredAt: '2026-09-26T04:00:00.000Z', createdAt: '2026-09-26T04:00:00.000Z', updatedAt: '2026-09-26T04:00:00.000Z', source: 'manual' }],
      incomes: [{ id: 'salary', amountSen: 5_000, category: 'salary', description: 'Salary', occurredAt: '2026-09-26T03:00:00.000Z', createdAt: '2026-09-26T03:00:00.000Z', updatedAt: '2026-09-26T03:00:00.000Z' }],
      exerciseRecords: [{ id: 'run', activity: 'Running', durationSeconds: 1_800, occurredAt: '2026-09-25T10:00:00.000Z', createdAt: '2026-09-25T10:00:00.000Z', updatedAt: '2026-09-25T10:00:00.000Z', source: 'manual' }],
      drafts: [], discardDraft: vi.fn(), createExpenseDraft: vi.fn(), updateExpenseDraft: vi.fn(), confirmExpenseDraft: vi.fn(), createExerciseDraft: vi.fn(), updateExerciseDraft: vi.fn(), confirmExerciseDraft: vi.fn(),
      expenseStatus: 'loaded', incomeStatus: 'loaded', exerciseStatus: 'loaded', expenseError: null, incomeError: null, exerciseError: null,
      retryExpenseSubscription: vi.fn(), retryIncomeSubscription: vi.fn(), retryExerciseSubscription: vi.fn(),
    } as unknown as ReturnType<typeof useRecords>)
    animeRepository.fetchPublishedSince.mockResolvedValue([{ externalId: 'new', title: 'New show', titleNormalized: 'new show', coverUrl: '', mediaType: 'anime', genres: [], status: 'airing', updatedAt: 2, firstPublishedAt: 2, filterKeys: [] }])
    animeRepository.countPublishedSince.mockResolvedValue(3)
  })

  it('changes layout only in explicit edit mode and can reset the UID-local preference', async () => {
    await act(async () => { render(<TodayPage onNavigate={vi.fn()} onOpenCommand={vi.fn()} />) })
    expect(screen.getByRole('button', { name: 'Open Finance' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Dashboard' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide Finance' }))
    expect(screen.queryByRole('button', { name: 'Open Finance' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }))
    expect(screen.getByRole('button', { name: 'Open Finance' })).toBeTruthy()
  })

  it('prioritizes the four primary domains, preserves signed overspend, and deep-links', async () => {
    const navigate = vi.fn()
    await act(async () => { render(<TodayPage onNavigate={navigate} onOpenCommand={vi.fn()} />) })
    expect(screen.getByText('Here is what matters today.')).toBeTruthy()
    expect(screen.getByLabelText('Today summary')).toBeTruthy()
    expect(screen.getByText('Frieren')).toBeTruthy()
    expect(screen.getByText('Budget is overspent this month.')).toBeTruthy()
    expect(screen.getByText(/saved across 1 active goal/)).toBeTruthy()
    expect(screen.getByText(/Phone 56%/)).toBeTruthy()
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Open Finance' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Exercise' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Anime' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review this week' }))
    expect(navigate.mock.calls.map(([page]) => page)).toEqual(['expenses', 'exercise', 'anime', 'review'])
  })

  it('keeps domain errors scoped and the rest of Home usable', async () => {
    animeRepository.fetchPublishedSince.mockRejectedValue(new Error('offline'))
    await act(async () => { render(<TodayPage onNavigate={vi.fn()} onOpenCommand={vi.fn()} />) })
    expect(screen.getByRole('alert').textContent).toContain('Anime updates')
    expect(screen.getByRole('button', { name: 'Open Finance' })).toBeTruthy()
  })
})
