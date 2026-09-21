import type { Firestore } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'
import { createFirestoreExerciseRepository } from './firestoreExerciseRepository'
import { createFirestoreExpenseRepository } from './firestoreExpenseRepository'
import { createFirestoreIncomeRepository } from './firestoreIncomeRepository'

const firestoreMock = vi.hoisted(() => {
  const deletedField = { deleted: true }
  const transaction = {
    get: vi.fn(async () => ({ exists: (): boolean => true })),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  return { deletedField, transaction }
})

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  deleteField: vi.fn(() => firestoreMock.deletedField),
  serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
  Timestamp: { fromDate: vi.fn((date: Date) => date) },
  runTransaction: vi.fn(async (
    _firestore: unknown,
    update: (transaction: typeof firestoreMock.transaction) => Promise<unknown>,
  ) => update(firestoreMock.transaction)),
}))

const firestore = {} as Firestore
const occurredAt = '2026-09-17T10:00:00.000Z'

describe('Firestore optional-field updates', () => {
  it('writes a confirmed text-sourced Exercise with internal seconds and no inferred distance', async () => {
    firestoreMock.transaction.get.mockResolvedValueOnce({ exists: () => false })
    firestoreMock.transaction.set.mockClear()
    const repository = createFirestoreExerciseRepository(firestore, 'user')
    await repository.createExercise('exercise', {
      activity: 'Badminton', durationSeconds: 5400, occurredAt, source: 'text',
    })

    expect(firestoreMock.transaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ activity: 'Badminton', durationSeconds: 5400, source: 'text' }),
    )
    expect(firestoreMock.transaction.set.mock.calls[0][1]).not.toHaveProperty('distanceMetres')
  })

  it('deletes cleared Exercise distance instead of writing zero', async () => {
    firestoreMock.transaction.update.mockClear()
    const repository = createFirestoreExerciseRepository(firestore, 'user')
    await repository.updateExercise('exercise', {
      activity: 'Walk', durationSeconds: 1800, occurredAt, source: 'manual',
    })

    expect(firestoreMock.transaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ distanceMetres: firestoreMock.deletedField }),
    )
  })

  it('writes source-reported screenshot metrics separately from derived estimates', async () => {
    firestoreMock.transaction.get.mockResolvedValueOnce({ exists: () => false })
    firestoreMock.transaction.set.mockClear()
    const repository = createFirestoreExerciseRepository(firestore, 'user')
    await repository.createExercise('screenshot', {
      activity: 'Running', durationSeconds: 1800, occurredAt, source: 'fitness_screenshot',
      metricsSource: 'Apple Fitness', reportedActiveCaloriesKcal: 382, reportedSteps: 6100,
    })
    const data = firestoreMock.transaction.set.mock.calls[0][1]
    expect(data).toMatchObject({ source: 'fitness_screenshot', metricsSource: 'Apple Fitness',
      reportedActiveCaloriesKcal: 382, reportedSteps: 6100 })
    expect(data).not.toHaveProperty('estimatedCalories')
  })

  it('removes cleared screenshot metrics during edit', async () => {
    firestoreMock.transaction.update.mockClear()
    const repository = createFirestoreExerciseRepository(firestore, 'user')
    await repository.updateExercise('screenshot', {
      activity: 'Running', durationSeconds: 1800, occurredAt, source: 'fitness_screenshot',
    })
    expect(firestoreMock.transaction.update.mock.calls[0][1]).toMatchObject({
      reportedActiveCaloriesKcal: firestoreMock.deletedField,
      reportedTotalCaloriesKcal: firestoreMock.deletedField,
      reportedAverageHeartRateBpm: firestoreMock.deletedField,
      reportedSteps: firestoreMock.deletedField,
    })
  })

  it('deletes a cleared Expense note while keeping the integer sen amount', async () => {
    firestoreMock.transaction.update.mockClear()
    const repository = createFirestoreExpenseRepository(firestore, 'user')
    await repository.updateExpense('expense', {
      amountSen: 1234, category: 'food', title: 'Lunch',
      occurredAt, source: 'manual',
    })

    expect(firestoreMock.transaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amountSen: 1234, note: firestoreMock.deletedField }),
    )
  })

  it('creates Income as a separate positive integer-sen record', async () => {
    firestoreMock.transaction.get.mockResolvedValueOnce({ exists: () => false })
    firestoreMock.transaction.set.mockClear()
    const repository = createFirestoreIncomeRepository(firestore, 'user')
    await repository.createIncome('income', {
      amountSen: 250_000, category: 'salary', description: 'Monthly salary', occurredAt,
    })
    expect(firestoreMock.transaction.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      amountSen: 250_000, category: 'salary', description: 'Monthly salary',
    }))
  })

  it('edits and deletes Income without touching Expense storage', async () => {
    const repository = createFirestoreIncomeRepository(firestore, 'user')
    firestoreMock.transaction.update.mockClear()
    firestoreMock.transaction.delete.mockClear()
    await repository.updateIncome('income', {
      amountSen: 260_000, category: 'business', description: 'Client payment', occurredAt,
    })
    await repository.deleteIncome('income')
    expect(firestoreMock.transaction.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ amountSen: 260_000, note: firestoreMock.deletedField }))
    expect(firestoreMock.transaction.delete).toHaveBeenCalledOnce()
  })

  it('rejects non-positive or fractional Income amounts before Firestore', async () => {
    const repository = createFirestoreIncomeRepository(firestore, 'user')
    const invalid = { amountSen: -1, category: 'salary' as const, description: 'Salary', occurredAt }
    firestoreMock.transaction.get.mockResolvedValue({ exists: () => false })
    await expect(repository.createIncome('bad', invalid)).rejects.toThrow('positive integer')
    await expect(repository.createIncome('fractional', { ...invalid, amountSen: 12.5 })).rejects.toThrow('positive integer')
  })
})
