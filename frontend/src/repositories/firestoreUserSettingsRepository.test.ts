import type { Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFirestoreUserSettingsRepository } from './firestoreUserSettingsRepository'

const mock = vi.hoisted(() => {
  const stored = new Map<string, Record<string, unknown>>()
  const doc = vi.fn((parent: unknown, ...segments: string[]) => Array.isArray(parent)
    ? [...parent, ...segments] : segments)
  const collection = vi.fn((...segments: unknown[]) => segments.slice(1))
  const setDoc = vi.fn(async (..._args: unknown[]) => undefined)
  const onSnapshot = vi.fn((..._args: unknown[]) => () => undefined)
  const serverTimestamp = vi.fn(() => ({ server: true }))
  const orderBy = vi.fn((field: string, direction: string) => [field, direction])
  const query = vi.fn((reference: unknown) => reference)
  const runTransaction = vi.fn(async (_firestore: unknown, callback: (transaction: unknown) => Promise<void>) => {
    await callback({
      get: async (reference: string[]) => ({ exists: () => stored.has(reference.join('/')),
        data: () => stored.get(reference.join('/')) }),
      set: (reference: string[], value: Record<string, unknown>) => stored.set(reference.join('/'), value),
    })
  })
  return { stored, doc, collection, setDoc, onSnapshot, serverTimestamp, orderBy, query, runTransaction }
})
vi.mock('firebase/firestore', () => mock)
const firestore = {} as Firestore
const id = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  mock.stored.clear()
  for (const value of Object.values(mock)) if (typeof value === 'function' && 'mockClear' in value) value.mockClear()
})

describe('UID scoped settings and measurement repository', () => {
  it('keeps legacy current values and reads dated history in order', () => {
    const repository = createFirestoreUserSettingsRepository(firestore, 'owner')
    const settings = vi.fn()
    repository.subscribe({ next: settings, error: vi.fn() })
    const callback = mock.onSnapshot.mock.calls[0][2] as (snapshot: unknown) => void
    callback({ metadata: { fromCache: false, hasPendingWrites: false }, exists: () => true,
      data: () => ({ bodyWeightKg: 71.5, heightCm: 175 }) })
    expect(settings).toHaveBeenCalledWith({ bodyWeightKg: 71.5, heightCm: 175,
      monthlyBudgetSen: null, savingsGoalSen: null })
    const next = vi.fn()
    repository.subscribeMeasurements({ next, error: vi.fn() })
    const history = mock.onSnapshot.mock.calls[1][2] as (snapshot: unknown) => void
    history({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [
      { id: 'new', data: () => ({ kind: 'weight', value: 71.5, recordedAt: { toDate: () => new Date('2026-10-09T10:00:00Z') } }) },
      { id: 'old', data: () => ({ kind: 'weight', value: 72, recordedAt: { toDate: () => new Date('2026-10-08T10:00:00Z') } }) },
    ] })
    expect(next).toHaveBeenCalledWith([
      { id: 'new', kind: 'weight', value: 71.5, recordedAt: '2026-10-09T10:00:00.000Z' },
      { id: 'old', kind: 'weight', value: 72, recordedAt: '2026-10-08T10:00:00.000Z' },
    ])
  })

  it('atomically records deliberate equal updates and safely repeats one submission ID', async () => {
    const repository = createFirestoreUserSettingsRepository(firestore, 'owner')
    await repository.saveBodyWeight(70, id)
    expect(mock.runTransaction).toHaveBeenCalledOnce()
    expect(mock.stored.get(`users/owner/bodyMeasurements/${id}`)).toEqual({
      kind: 'weight', value: 70, recordedAt: { server: true },
    })
    expect(mock.stored.get('users/owner/settings/preferences')).toEqual({ bodyWeightKg: 70, updatedAt: { server: true } })
    await repository.saveBodyWeight(70, id)
    expect(mock.stored.size).toBe(2)
    await repository.saveBodyWeight(70, '22222222-2222-4222-8222-222222222222')
    expect(mock.stored.size).toBe(3)
    await expect(repository.saveHeight(175, id)).rejects.toThrow('conflict')
    await expect(repository.saveBodyWeight(0, id)).rejects.toThrow()
    await expect(repository.saveHeight(175.5, id)).rejects.toThrow()
  })

  it('keeps budget updates compatible with the existing settings document', async () => {
    const repository = createFirestoreUserSettingsRepository(firestore, 'owner')
    await repository.saveMonthlyBudget(20025)
    await repository.saveSavingsGoal(150050)
    expect(mock.setDoc.mock.calls[0]).toEqual([
      ['users', 'owner', 'settings', 'preferences'], { monthlyBudgetSen: 20025, updatedAt: { server: true } }, { merge: true },
    ])
    expect(mock.setDoc.mock.calls[1][1]).toEqual({ savingsGoalSen: 150050, updatedAt: { server: true } })
  })
})
