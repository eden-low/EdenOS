import type { Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFirestoreFinancePlanningRepository } from './firestoreFinancePlanningRepository'

const mock = vi.hoisted(() => {
  const transaction = { get: vi.fn(), set: vi.fn(), update: vi.fn() }
  return {
    transaction,
    collection: vi.fn((base: unknown, ...parts: string[]) => [typeof base === 'string' ? base : '', ...parts].filter(Boolean).join('/')),
    doc: vi.fn((base: unknown, ...parts: string[]) => [typeof base === 'string' ? base : '', ...parts].filter(Boolean).join('/')),
    onSnapshot: vi.fn(), orderBy: vi.fn(), query: vi.fn(), where: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ server: true })),
    runTransaction: vi.fn(async (_firestore: unknown, callback: (transaction: unknown) => unknown) => callback(transaction)),
    Timestamp: class { static fromDate(date: Date) { return { date } } },
  }
})
vi.mock('firebase/firestore', () => mock)

describe('Firestore Finance planning writes', () => {
  beforeEach(() => { vi.clearAllMocks(); mock.transaction.get.mockResolvedValue({ exists: () => false }) })

  it('stores an opening goal balance without fabricating a monthly allocation event', async () => {
    const repository = createFirestoreFinancePlanningRepository({} as Firestore, 'owner')
    await repository.createGoal('car', { name: 'Car', targetAmountSen: 3_000_000, targetDate: null, status: 'active' }, 1_200_000)
    expect(mock.transaction.set).toHaveBeenCalledTimes(1)
    expect(mock.transaction.set).toHaveBeenCalledWith('users/owner/financeGoals/car', expect.objectContaining({ targetAmountSen: 3_000_000, allocatedAmountSen: 1_200_000 }))
  })

  it('updates the goal balance and appends a distinct allocation in one transaction', async () => {
    mock.transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ allocatedAmountSen: 280_000 }) })
    const repository = createFirestoreFinancePlanningRepository({} as Firestore, 'owner')
    const goal = { id: 'phone', name: 'Phone', targetAmountSen: 500_000, allocatedAmountSen: 280_000, targetDate: null, status: 'active' as const, createdAt: 1, updatedAt: 1, source: 'stored' as const }
    await repository.contribute(goal, 20_000, new Date('2026-09-26T12:00:00.000Z'), 'allocation-1')
    expect(mock.transaction.update).toHaveBeenCalledWith('users/owner/financeGoals/phone', expect.objectContaining({ allocatedAmountSen: 300_000 }))
    expect(mock.transaction.set).toHaveBeenCalledWith('users/owner/financeGoalAllocations/allocation-1', expect.objectContaining({ goalId: 'phone', amountSen: 20_000 }))
  })
})
