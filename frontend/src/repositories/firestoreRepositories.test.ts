import type { Firestore } from 'firebase/firestore'
import { describe, expect, it, vi } from 'vitest'
import { createFirestoreExerciseRepository } from './firestoreExerciseRepository'
import { createFirestoreExpenseRepository } from './firestoreExpenseRepository'

const firestoreMock = vi.hoisted(() => {
  const deletedField = { deleted: true }
  const transaction = {
    get: vi.fn(async () => ({ exists: () => true })),
    update: vi.fn(),
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
})
