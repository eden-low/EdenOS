import type { Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guestHasMeaningfulData } from './guestAccountRepository'

const sdk = vi.hoisted(() => ({
  collection: vi.fn((...parts: unknown[]) => parts.slice(1).join('/')),
  doc: vi.fn((...parts: unknown[]) => parts.slice(1).join('/')),
  limit: vi.fn((size: number) => size),
  query: vi.fn((path: string) => path),
  getDocsFromServer: vi.fn(),
  getDocFromServer: vi.fn(),
}))
vi.mock('firebase/firestore', () => sdk)

const db = {} as Firestore
function state(expenses = false, exercises = false, settings: Record<string, unknown> | null = null) {
  sdk.getDocsFromServer.mockResolvedValueOnce({ empty: !expenses }).mockResolvedValueOnce({ empty: !exercises })
  sdk.getDocFromServer.mockResolvedValue({ exists: () => settings !== null, data: () => settings })
}
beforeEach(() => { vi.clearAllMocks() })

describe('authoritative Guest data check', () => {
  it('finds an empty Guest across all owner paths', async () => {
    state()
    expect(await guestHasMeaningfulData(db, 'guest-uid')).toBe(false)
    expect(sdk.collection.mock.calls.map((call) => call.slice(1))).toEqual([
      ['users', 'guest-uid', 'expenses'], ['users', 'guest-uid', 'exercises'],
    ])
    expect(sdk.doc).toHaveBeenCalledWith(db, 'users', 'guest-uid', 'settings', 'preferences')
    expect(sdk.getDocsFromServer).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['Expense', true, false, null],
    ['Exercise', false, true, null],
    ['body weight', false, false, { bodyWeightKg: 70 }],
    ['Budget', false, false, { monthlyBudgetSen: 10000 }],
    ['Savings Goal', false, false, { savingsGoalSen: 50000 }],
  ])('protects a Guest with %s', async (_name, expense, exercise, settings) => {
    state(expense as boolean, exercise as boolean, settings as Record<string, unknown> | null)
    expect(await guestHasMeaningfulData(db, 'guest-uid')).toBe(true)
  })

  it('treats a failed server read as unsafe, never as empty', async () => {
    sdk.getDocsFromServer.mockRejectedValue(new Error('offline'))
    sdk.getDocFromServer.mockResolvedValue({ exists: () => false })
    await expect(guestHasMeaningfulData(db, 'guest-uid')).rejects.toThrow('offline')
  })
})
