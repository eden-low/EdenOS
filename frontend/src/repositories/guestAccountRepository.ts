import { collection, doc, getCountFromServer, getDocFromServer, query, type Firestore } from 'firebase/firestore'
import { isValidBodyWeightKg, isValidSettingsAmountSen } from '../domain/userSettings'
import type { GuestDataSummary } from '../types/account'

const knownPreferenceFields = new Set([
  'bodyWeightKg', 'monthlyBudgetSen', 'savingsGoalSen', 'updatedAt',
])

function count(snapshot: Awaited<ReturnType<typeof getCountFromServer>>): number {
  const value = snapshot.data().count
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

// Read the owner's persisted data from the server. A cache-only or failed read must
// never authorize replacing an anonymous session.
export async function getGuestDataSummary(
  firestore: Firestore,
  uid: string,
  localAnimeProgressCount = 0,
): Promise<GuestDataSummary> {
  const user = ['users', uid] as const
  const [expenses, exercises, animeProgress, preferences] = await Promise.all([
    getCountFromServer(query(collection(firestore, ...user, 'expenses'))),
    getCountFromServer(query(collection(firestore, ...user, 'exercises'))),
    getCountFromServer(query(collection(firestore, ...user, 'animeWatchProgress'))),
    getDocFromServer(doc(firestore, ...user, 'settings', 'preferences')),
  ])

  const data = preferences.exists() ? preferences.data() : {}
  const expensesCount = count(expenses)
  const exercisesCount = count(exercises)
  const animeCloudProgressCount = count(animeProgress)
  const hasBodyWeight = isValidBodyWeightKg(data.bodyWeightKg)
  const hasBudget = isValidSettingsAmountSen(data.monthlyBudgetSen)
  const hasSavingsGoal = isValidSettingsAmountSen(data.savingsGoalSen)
  const otherBlockingData = Object.entries(data)
    .filter(([key, value]) => !knownPreferenceFields.has(key) && value !== null && value !== undefined)
    .map(([key]) => key)
    .sort()
  const hasBlockingData = expensesCount > 0 || exercisesCount > 0 || hasBodyWeight || hasBudget ||
    hasSavingsGoal || otherBlockingData.length > 0

  return {
    expensesCount,
    exercisesCount,
    hasBodyWeight,
    hasBudget,
    hasSavingsGoal,
    animeProgressCount: Math.max(localAnimeProgressCount, animeCloudProgressCount),
    animeCloudProgressCount,
    otherBlockingData,
    hasBlockingData,
  }
}
