import type { Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFirestoreUserSettingsRepository } from './firestoreUserSettingsRepository'

const mock = vi.hoisted(() => ({
  doc: vi.fn((...segments: unknown[]) => segments.slice(1)),
  setDoc: vi.fn(async (..._args: unknown[]) => undefined),
  onSnapshot: vi.fn((..._args: unknown[]) => () => undefined),
  serverTimestamp: vi.fn(() => ({ server: true })),
}))
vi.mock('firebase/firestore', () => mock)
const firestore = {} as Firestore

beforeEach(() => { mock.doc.mockClear(); mock.setDoc.mockClear(); mock.onSnapshot.mockClear() })

describe('UID scoped settings repository', () => {
  it('reads a persisted settings document and ignores pending local snapshots', () => {
    const repository = createFirestoreUserSettingsRepository(firestore, 'owner')
    const next = vi.fn()
    repository.subscribe({ next, error: vi.fn() })
    expect(mock.doc).toHaveBeenCalledWith(firestore, 'users', 'owner', 'settings', 'preferences')
    const callback = mock.onSnapshot.mock.calls[0][2] as (snapshot: unknown) => void
    callback({ metadata: { fromCache: false, hasPendingWrites: true } })
    expect(next).not.toHaveBeenCalled()
    callback({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => false })
    expect(next).toHaveBeenCalledWith({ bodyWeightKg: null, monthlyBudgetSen: null, savingsGoalSen: null })
    callback({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true,
      data: () => ({ bodyWeightKg: 71.5, monthlyBudgetSen: 20025, savingsGoalSen: 150050 }) })
    expect(next).toHaveBeenLastCalledWith({ bodyWeightKg: 71.5, monthlyBudgetSen: 20025, savingsGoalSen: 150050 })
  })

  it('writes valid weight and money only to the owner document', async () => {
    const repository = createFirestoreUserSettingsRepository(firestore, 'owner')
    await repository.saveBodyWeight(70)
    await repository.saveBodyWeight(71.5)
    await repository.saveMonthlyBudget(20025)
    await repository.saveSavingsGoal(150050)
    expect(mock.setDoc).toHaveBeenCalledTimes(4)
    expect(mock.setDoc.mock.calls[2][0]).toEqual(['users', 'owner', 'settings', 'preferences'])
    expect(mock.setDoc.mock.calls[2][1]).toEqual({ monthlyBudgetSen: 20025, updatedAt: { server: true } })
    expect(mock.setDoc.mock.calls[3][1]).toEqual({ savingsGoalSen: 150050, updatedAt: { server: true } })
    expect(mock.setDoc.mock.calls[3][2]).toEqual({ merge: true })
    await expect(repository.saveBodyWeight(0)).rejects.toThrow()
    await expect(repository.saveMonthlyBudget(1.5)).rejects.toThrow()
    await expect(repository.saveSavingsGoal(0)).rejects.toThrow()
    expect(mock.setDoc).toHaveBeenCalledTimes(4)
  })
})
