import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecords } from '../../state/useRecords'
import { CommandPalette } from './CommandPalette'

const animeRepository = vi.hoisted(() => ({ searchTitles: vi.fn() }))
const financeRuleState = vi.hoisted(() => ({ rules: [] as Array<Record<string, unknown>> }))

vi.mock('../../repositories/firestoreAnimeRepository', () => ({ createFirestoreAnimeRepository: () => animeRepository }))
vi.mock('../../state/useFirebaseAuth', () => ({ useFirebaseAuth: () => ({ firestore: {} }) }))
vi.mock('../../state/useRecords', () => ({ useRecords: vi.fn() }))
vi.mock('../../state/useFinanceRules', () => ({ useFinanceRules: () => financeRuleState }))

describe('CommandPalette', () => {
  const createExpense = vi.fn()
  const createIncome = vi.fn()
  const createExercise = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    createExpense.mockResolvedValue(undefined)
    createIncome.mockResolvedValue(undefined)
    createExercise.mockResolvedValue(undefined)
    financeRuleState.rules = []
    vi.mocked(useRecords).mockReturnValue({ createExpense, createIncome, createExercise } as unknown as ReturnType<typeof useRecords>)
  })

  it('applies a user rule only to the reviewed candidate', async () => {
    financeRuleState.rules = [{ id: 'rule', direction: 'expense', matchType: 'contains', pattern: 'petronas', category: 'transport', enabled: true, createdAt: 1, updatedAt: 1 }]
    render(<CommandPalette open onClose={vi.fn()} onNavigate={vi.fn()} onAnimeSearch={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('EdenOS command'), { target: { value: 'Add expense RM50 PETRONAS Ampang' } })
    fireEvent.click(screen.getByRole('button', { name: /Review expense/i }))
    expect(createExpense).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({ category: 'transport' })))
  })

  it('does not persist a parsed expense until the user explicitly confirms it', async () => {
    render(<CommandPalette open onClose={vi.fn()} onNavigate={vi.fn()} onAnimeSearch={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('EdenOS command'), { target: { value: 'Add expense RM18 lunch' } })
    fireEvent.click(screen.getByRole('button', { name: /Review expense/i }))

    expect(screen.getByLabelText('expense candidate review')).toBeTruthy()
    expect(createExpense).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm expense' }))
    await waitFor(() => expect(createExpense).toHaveBeenCalledTimes(1))
    expect(createExpense.mock.calls[0][0]).toMatchObject({ amountSen: 1800, title: 'lunch', source: 'text' })
  })

  it('navigates directly without creating a record', () => {
    const onNavigate = vi.fn()
    render(<CommandPalette open onClose={vi.fn()} onNavigate={onNavigate} onAnimeSearch={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('EdenOS command'), { target: { value: 'Weekly review' } })
    fireEvent.submit(screen.getByLabelText('EdenOS command').closest('form')!)

    expect(onNavigate).toHaveBeenCalledWith('review')
    expect(createExpense).not.toHaveBeenCalled()
    expect(createIncome).not.toHaveBeenCalled()
    expect(createExercise).not.toHaveBeenCalled()
  })
})
