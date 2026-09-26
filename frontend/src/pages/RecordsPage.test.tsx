import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useRecords } from '../state/useRecords'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { RecordsPage } from './RecordsPage'

vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../state/useAnimeProgress', () => ({ useAnimeProgress: vi.fn() }))

function provideRecords(status: 'loaded' | 'loading' | 'error' = 'loaded') {
  vi.mocked(useRecords).mockReturnValue({
    expenses: [],
    incomes: [],
    exerciseRecords: [],
    expenseStatus: status,
    expenseError: status === 'error' ? 'Expense records unavailable.' : null,
    incomeStatus: status,
    incomeError: status === 'error' ? 'Income records unavailable.' : null,
    exerciseStatus: status,
    exerciseError: status === 'error' ? 'Exercise records unavailable.' : null,
    retryExpenseSubscription: vi.fn(),
    retryIncomeSubscription: vi.fn(),
    retryExerciseSubscription: vi.fn(),
    drafts: [],
  } as unknown as ReturnType<typeof useRecords>)
}

beforeEach(() => {
  vi.mocked(useLocalReferenceDate).mockReturnValue(new Date(2026, 8, 17, 12))
  vi.mocked(useAnimeProgress).mockReturnValue({ items: [], cloudError: null, saveProgress: vi.fn(), flushProgress: vi.fn() } as ReturnType<typeof useAnimeProgress>)
  provideRecords()
})

describe('Records page empty state', () => {
  it('opens the existing Capture methods from a loaded empty history', () => {
    render(<RecordsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Capture a record' }))
    expect(screen.getByRole('dialog', { name: 'Capture' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exercise Text' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Expense Receipt' })).toBeTruthy()
  })

  it('keeps the empty Capture action out of loading and error states', () => {
    provideRecords('loading')
    const { rerender } = render(<RecordsPage />)
    expect(screen.queryByRole('button', { name: 'Capture a record' })).toBeNull()

    provideRecords('error')
    rerender(<RecordsPage />)
    expect(screen.queryByRole('button', { name: 'Capture a record' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(3)
  })

  it('renders a chronological cross-domain timeline with signed finance amounts', () => {
    const iso = (hour: number) => new Date(2026, 8, 17, hour).toISOString()
    vi.mocked(useRecords).mockReturnValue({
      expenses: [{ id: 'lunch', title: 'Lunch', category: 'food', amountSen: 1_850, occurredAt: iso(13), createdAt: iso(13), updatedAt: iso(13), source: 'manual' }],
      incomes: [{ id: 'salary', description: 'Salary', category: 'salary', amountSen: 600_000, occurredAt: iso(9), createdAt: iso(9), updatedAt: iso(9) }],
      exerciseRecords: [{ id: 'run', activity: 'Running', durationSeconds: 1_920, occurredAt: iso(18), createdAt: iso(18), updatedAt: iso(18), source: 'manual' }],
      expenseStatus: 'loaded', expenseError: null, incomeStatus: 'loaded', incomeError: null, exerciseStatus: 'loaded', exerciseError: null,
      retryExpenseSubscription: vi.fn(), retryIncomeSubscription: vi.fn(), retryExerciseSubscription: vi.fn(), drafts: [],
    } as unknown as ReturnType<typeof useRecords>)
    vi.mocked(useAnimeProgress).mockReturnValue({ items: [{ externalId: 'frieren', animeId: 'frieren', title: 'Frieren', currentEpisode: 3, positionSeconds: 0, durationSeconds: 0, watchedEpisodes: [1, 2], trackingStatus: 'watching', updatedAt: new Date(2026, 8, 17, 19).getTime() }], cloudError: null, saveProgress: vi.fn(), flushProgress: vi.fn() } as ReturnType<typeof useAnimeProgress>)

    render(<RecordsPage />)

    expect(screen.getByText('Frieren')).toBeTruthy()
    expect(screen.getByText('Running')).toBeTruthy()
    expect(screen.getByText('Lunch')).toBeTruthy()
    expect(screen.getAllByText('Salary').length).toBeGreaterThan(0)
    expect(screen.getByText(/−\s*RM\s*18\.50/)).toBeTruthy()
    expect(screen.getByText(/\+\s*RM\s*6,000/)).toBeTruthy()
    const titles = Array.from(screen.getByRole('region', { name: 'Activity timeline' }).querySelectorAll('p.truncate')).map((node) => node.textContent)
    expect(titles).toEqual(['Frieren', 'Running', 'Lunch', 'Salary'])
  })
})
