import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { useRecords } from '../state/useRecords'
import { RecordsPage } from './RecordsPage'

vi.mock('../hooks/useLocalReferenceDate', () => ({ useLocalReferenceDate: vi.fn() }))
vi.mock('../state/useRecords', () => ({ useRecords: vi.fn() }))

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
})
