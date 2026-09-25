import type { Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGuestDataSummary } from './guestAccountRepository'

const sdk = vi.hoisted(() => ({
  collection: vi.fn((...parts: unknown[]) => parts.slice(1).join('/')),
  doc: vi.fn((...parts: unknown[]) => parts.slice(1).join('/')),
  query: vi.fn((path: string) => path),
  getCountFromServer: vi.fn(),
  getDocFromServer: vi.fn(),
}))
vi.mock('firebase/firestore', () => sdk)

const db = {} as Firestore
function state(
  expensesCount = 0,
  incomesCount = 0,
  exercisesCount = 0,
  settings: Record<string, unknown> | null = null,
  animeCloudProgressCount = 0,
  financeRulesCount = 0,
  weeklyReviewsCount = 0,
) {
  for (const value of [expensesCount, incomesCount, exercisesCount, animeCloudProgressCount, financeRulesCount, weeklyReviewsCount]) {
    sdk.getCountFromServer.mockResolvedValueOnce({ data: () => ({ count: value }) })
  }
  sdk.getDocFromServer.mockResolvedValue({ exists: () => settings !== null, data: () => settings })
}
beforeEach(() => { vi.clearAllMocks() })

describe('authoritative Guest data summary', () => {
  it('finds a completely empty Guest across every owner path', async () => {
    state()
    expect(await getGuestDataSummary(db, 'guest-uid')).toEqual({
      expensesCount: 0,
      incomesCount: 0,
      exercisesCount: 0,
      hasBodyWeight: false,
      hasHeight: false,
      hasBudget: false,
      hasSavingsGoal: false,
      animeProgressCount: 0,
      animeCloudProgressCount: 0,
      otherBlockingData: [],
      hasBlockingData: false,
    })
    expect(sdk.collection.mock.calls.map((call) => call.slice(1))).toEqual([
      ['users', 'guest-uid', 'expenses'],
      ['users', 'guest-uid', 'incomes'],
      ['users', 'guest-uid', 'exercises'],
      ['users', 'guest-uid', 'animeWatchProgress'],
      ['users', 'guest-uid', 'financeRules'],
      ['users', 'guest-uid', 'weeklyReviews'],
    ])
    expect(sdk.doc).toHaveBeenCalledWith(db, 'users', 'guest-uid', 'settings', 'preferences')
  })

  it.each([
    ['Expense', 2, 0, 0, null, { expensesCount: 2 }],
    ['Income', 0, 2, 0, null, { incomesCount: 2 }],
    ['Exercise', 0, 0, 1, null, { exercisesCount: 1 }],
    ['body weight', 0, 0, 0, { bodyWeightKg: 70 }, { hasBodyWeight: true }],
    ['height', 0, 0, 0, { heightCm: 175 }, { hasHeight: true }],
    ['Budget', 0, 0, 0, { monthlyBudgetSen: 10000 }, { hasBudget: true }],
    ['Savings Goal', 0, 0, 0, { savingsGoalSen: 50000 }, { hasSavingsGoal: true }],
  ])('protects a Guest with %s', async (_name, expenses, incomes, exercises, settings, expected) => {
    state(expenses as number, incomes as number, exercises as number, settings as Record<string, unknown> | null)
    expect(await getGuestDataSummary(db, 'guest-uid')).toMatchObject({ ...expected, hasBlockingData: true })
  })

  it('reports multiple blocking categories together', async () => {
    state(2, 1, 3, { bodyWeightKg: 72, monthlyBudgetSen: 10000, savingsGoalSen: 50000 })
    expect(await getGuestDataSummary(db, 'guest-uid')).toMatchObject({
      expensesCount: 2,
      incomesCount: 1,
      exercisesCount: 3,
      hasBodyWeight: true,
      hasHeight: false,
      hasBudget: true,
      hasSavingsGoal: true,
      hasBlockingData: true,
    })
  })

  it('treats local and legacy cloud Anime progress as non-blocking', async () => {
    state(0, 0, 0, null, 2)
    expect(await getGuestDataSummary(db, 'guest-uid', 3)).toMatchObject({
      animeProgressCount: 3,
      animeCloudProgressCount: 2,
      hasBlockingData: false,
    })
  })

  it('protects UID-scoped Finance rules during a Guest account switch', async () => {
    state(0, 0, 0, null, 0, 1)
    expect(await getGuestDataSummary(db, 'guest-uid')).toMatchObject({ otherBlockingData: ['financeRules'], hasBlockingData: true })
  })

  it('protects saved Weekly Review reflections during a Guest account switch', async () => {
    state(0, 0, 0, null, 0, 0, 1)
    expect(await getGuestDataSummary(db, 'guest-uid')).toMatchObject({ otherBlockingData: ['weeklyReviews'], hasBlockingData: true })
  })

  it('ignores empty known preference placeholders but protects unknown saved data', async () => {
    state(0, 0, 0, { updatedAt: {}, bodyWeightKg: null, heightCm: null, monthlyBudgetSen: null, savingsGoalSen: null })
    expect((await getGuestDataSummary(db, 'guest-uid')).hasBlockingData).toBe(false)
    vi.clearAllMocks()
    state(0, 0, 0, { futureDurableSetting: true })
    expect(await getGuestDataSummary(db, 'guest-uid')).toMatchObject({
      otherBlockingData: ['futureDurableSetting'],
      hasBlockingData: true,
    })
  })

  it('treats a failed server read as unsafe, never as empty', async () => {
    sdk.getCountFromServer.mockRejectedValue(new Error('offline'))
    sdk.getDocFromServer.mockResolvedValue({ exists: () => false })
    await expect(getGuestDataSummary(db, 'guest-uid')).rejects.toThrow('offline')
  })
})
