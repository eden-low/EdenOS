import { act, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineExerciseWriteError } from '../lib/exerciseWriteError'
import { OfflineExpenseWriteError } from '../lib/expenseWriteError'
import { useConnectivity } from '../providers/useConnectivity'
import { createFirestoreExerciseRepository } from '../repositories/firestoreExerciseRepository'
import { createFirestoreExpenseRepository } from '../repositories/firestoreExpenseRepository'
import type { ExerciseRepository } from '../repositories/exerciseRepository'
import type { ExpenseRepository } from '../repositories/expenseRepository'
import type { ExpenseData, ExerciseData } from '../types/records'
import { RecordsProvider } from './RecordsContext'
import type { RecordsContextValue } from './recordsContextDefinition'
import { useFirebaseAuth } from './useFirebaseAuth'
import { useRecords } from './useRecords'

vi.mock('../providers/useConnectivity', () => ({ useConnectivity: vi.fn() }))
vi.mock('./useFirebaseAuth', () => ({ useFirebaseAuth: vi.fn() }))
vi.mock('../repositories/firestoreExpenseRepository', () => ({
  createFirestoreExpenseRepository: vi.fn(),
}))
vi.mock('../repositories/firestoreExerciseRepository', () => ({
  createFirestoreExerciseRepository: vi.fn(),
}))

const at = '2026-09-17T10:00:00.000Z'
const expenseData: ExpenseData = {
  amountSen: 1234, category: 'food', title: 'Lunch', occurredAt: at, source: 'manual',
}
const exerciseData: ExerciseData = {
  activity: 'Walk', durationSeconds: 1800, occurredAt: at, source: 'manual',
}

let expenseRepository: ExpenseRepository
let exerciseRepository: ExerciseRepository
let records: RecordsContextValue

function Observer() {
  const value = useRecords()
  useEffect(() => { records = value }, [value])
  return null
}

async function renderRecords() {
  render(<RecordsProvider><Observer /></RecordsProvider>)
  await waitFor(() => {
    expect(records.expenseStatus).toBe('loaded')
    expect(records.exerciseStatus).toBe('loaded')
  })
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.mocked(useConnectivity).mockReturnValue('online')
  vi.mocked(useFirebaseAuth).mockReturnValue({ uid: 'test-user', firestore: {} } as ReturnType<typeof useFirebaseAuth>)
  expenseRepository = {
    subscribeExpenses: vi.fn((observer) => { observer.next([]); return () => undefined }),
    createExpense: vi.fn(async () => undefined),
    updateExpense: vi.fn(async () => undefined),
    deleteExpense: vi.fn(async () => undefined),
  }
  exerciseRepository = {
    subscribeExercises: vi.fn((observer) => { observer.next([]); return () => undefined }),
    createExercise: vi.fn(async () => undefined),
    updateExercise: vi.fn(async () => undefined),
    deleteExercise: vi.fn(async () => undefined),
  }
  vi.mocked(createFirestoreExpenseRepository).mockReturnValue(expenseRepository)
  vi.mocked(createFirestoreExerciseRepository).mockReturnValue(exerciseRepository)
})

describe('Records provider mutations', () => {
  it('keeps an Expense draft pending until its repository write resolves', async () => {
    const write = deferred()
    vi.mocked(expenseRepository.createExpense).mockReturnValue(write.promise)
    await renderRecords()
    let id = ''
    act(() => { id = records.createExpenseDraft(expenseData) })

    let confirmation!: Promise<void>
    act(() => { confirmation = records.confirmExpenseDraft(id) })
    expect(expenseRepository.createExpense).toHaveBeenCalledWith(id, expenseData)
    expect(records.drafts.map((draft) => draft.id)).toContain(id)
    expect(records.expenses).toEqual([])

    await act(async () => { write.resolve(); await confirmation })
    expect(records.drafts).toEqual([])
    expect(records.expenses).toEqual([])
  })

  it('keeps an Exercise draft pending until its repository write resolves', async () => {
    const write = deferred()
    vi.mocked(exerciseRepository.createExercise).mockReturnValue(write.promise)
    await renderRecords()
    let id = ''
    act(() => { id = records.createExerciseDraft(exerciseData) })

    let confirmation!: Promise<void>
    act(() => { confirmation = records.confirmExerciseDraft(id) })
    expect(exerciseRepository.createExercise).toHaveBeenCalledWith(id, exerciseData)
    expect(records.drafts.map((draft) => draft.id)).toContain(id)
    expect(records.exerciseRecords).toEqual([])

    await act(async () => { write.resolve(); await confirmation })
    expect(records.drafts).toEqual([])
    expect(records.exerciseRecords).toEqual([])
  })

  it('retains a draft when the repository rejects its write', async () => {
    vi.mocked(expenseRepository.createExpense).mockRejectedValue(new Error('write failed'))
    await renderRecords()
    let id = ''
    act(() => { id = records.createExpenseDraft(expenseData) })

    await expect(records.confirmExpenseDraft(id)).rejects.toThrow('write failed')
    expect(records.drafts.map((draft) => draft.id)).toEqual([id])
    expect(records.expenses).toEqual([])
  })

  it('rejects offline create, update, and delete before calling either repository', async () => {
    vi.mocked(useConnectivity).mockReturnValue('offline')
    await renderRecords()
    let expenseId = ''
    let exerciseId = ''
    act(() => {
      expenseId = records.createExpenseDraft(expenseData)
      exerciseId = records.createExerciseDraft(exerciseData)
    })

    await expect(records.confirmExpenseDraft(expenseId)).rejects.toBeInstanceOf(OfflineExpenseWriteError)
    await expect(records.updateExpense('expense', expenseData)).rejects.toBeInstanceOf(OfflineExpenseWriteError)
    await expect(records.deleteExpense('expense')).rejects.toBeInstanceOf(OfflineExpenseWriteError)
    await expect(records.confirmExerciseDraft(exerciseId)).rejects.toBeInstanceOf(OfflineExerciseWriteError)
    await expect(records.updateExercise('exercise', exerciseData)).rejects.toBeInstanceOf(OfflineExerciseWriteError)
    await expect(records.deleteExercise('exercise')).rejects.toBeInstanceOf(OfflineExerciseWriteError)
    expect(expenseRepository.createExpense).not.toHaveBeenCalled()
    expect(expenseRepository.updateExpense).not.toHaveBeenCalled()
    expect(expenseRepository.deleteExpense).not.toHaveBeenCalled()
    expect(exerciseRepository.createExercise).not.toHaveBeenCalled()
    expect(exerciseRepository.updateExercise).not.toHaveBeenCalled()
    expect(exerciseRepository.deleteExercise).not.toHaveBeenCalled()
    expect(records.drafts).toHaveLength(2)
  })
})
