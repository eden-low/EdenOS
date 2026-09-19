import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
const environment = await initializeTestEnvironment({ projectId: 'demo-edenos-rules', firestore: { rules } })

try {
  const alice = environment.authenticatedContext('alice').firestore()
  const anotherAliceDevice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const guest = environment.unauthenticatedContext().firestore()
  const anonymousUser = environment.authenticatedContext('anonymous-user', { firebase: { sign_in_provider: 'anonymous' } }).firestore()
  const path = 'users/alice/settings/preferences'
  const own = doc(alice, path)

  await assertSucceeds(getDoc(own))
  await assertFails(getDoc(doc(bob, path)))
  await assertFails(getDoc(doc(guest, path)))
  await assertSucceeds(setDoc(own, { bodyWeightKg: 70.5, updatedAt: serverTimestamp() }, { merge: true }))
  await assertSucceeds(setDoc(own, { monthlyBudgetSen: 20025, updatedAt: serverTimestamp() }, { merge: true }))
  await assertSucceeds(setDoc(own, { savingsGoalSen: 150050, updatedAt: serverTimestamp() }, { merge: true }))
  const saved = (await getDoc(own)).data()
  assert.equal(saved?.bodyWeightKg, 70.5)
  assert.equal(saved?.monthlyBudgetSen, 20025)
  assert.equal(saved?.savingsGoalSen, 150050)
  assert.equal((await getDoc(doc(anotherAliceDevice, path))).data()?.savingsGoalSen, 150050)
  await assertSucceeds(setDoc(own, { monthlyBudgetSen: 30000, updatedAt: serverTimestamp() }, { merge: true }))
  assert.equal((await getDoc(own)).data()?.monthlyBudgetSen, 30000)
  await assertFails(setDoc(doc(bob, path), { bodyWeightKg: 80, updatedAt: serverTimestamp() }, { merge: true }))
  await assertFails(setDoc(doc(guest, path), { bodyWeightKg: 80, updatedAt: serverTimestamp() }, { merge: true }))
  await assertFails(setDoc(own, { bodyWeightKg: 0, updatedAt: serverTimestamp() }, { merge: true }))
  await assertFails(setDoc(own, { monthlyBudgetSen: 1.5, updatedAt: serverTimestamp() }, { merge: true }))
  await assertFails(setDoc(own, { savingsGoalSen: -1, updatedAt: serverTimestamp() }, { merge: true }))
  await assertFails(setDoc(own, { admin: true, updatedAt: serverTimestamp() }, { merge: true }))

  const exercise = {
    activity: 'Badminton', durationSeconds: 1800, source: 'text',
    occurredAt: Timestamp.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(doc(alice, 'users/alice/exercises/old'), exercise))
  await assertSucceeds(setDoc(doc(alice, 'users/alice/exercises/intense'), { ...exercise, intensity: 'vigorous' }))
  const screenshot = { ...exercise, source: 'fitness_screenshot', metricsSource: 'Apple Fitness',
    reportedActiveCaloriesKcal: 382, reportedTotalCaloriesKcal: 431,
    reportedAverageHeartRateBpm: 148, reportedSteps: 6150 }
  await assertSucceeds(setDoc(doc(alice, 'users/alice/exercises/screenshot'), screenshot))
  await assertFails(setDoc(doc(bob, 'users/alice/exercises/foreign-screenshot'), screenshot))
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/bad-calories'), { ...screenshot, reportedActiveCaloriesKcal: -1 }))
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/bad-heart'), { ...screenshot, reportedAverageHeartRateBpm: 'fast' }))
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/bad-steps'), { ...screenshot, reportedSteps: 1.5 }))
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/fake-manual'), { ...screenshot, source: 'manual' }))
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/fake'), { ...exercise, estimatedCalories: 999 }))
  await assertFails(setDoc(doc(bob, 'users/alice/exercises/other'), exercise))

  const expense = {
    amountSen: 1234, category: 'food', title: 'Lunch', source: 'manual',
    occurredAt: Timestamp.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(doc(alice, 'users/alice/expenses/lunch'), expense))
  await assertFails(setDoc(doc(bob, 'users/alice/expenses/other'), expense))

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'animes/sample-anime'), {
      externalId: 'sample-anime', title: 'Sample Anime', titleNormalized: 'sample anime',
      coverUrl: 'https://media.example/cover.jpg', mediaType: 'anime', genres: ['Fantasy'],
      status: 'completed', updatedAt: Timestamp.now(), filterKeys: ['mediaType:anime'],
    })
  })
  await assertSucceeds(getDoc(doc(alice, 'animes/sample-anime')))
  await assertSucceeds(getDocs(collection(anonymousUser, 'animes')))
  await assertFails(getDoc(doc(guest, 'animes/sample-anime')))
  await assertFails(setDoc(doc(alice, 'animes/client-write'), { title: 'Unsafe' }))

  const progress = {
    externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2,
    positionSeconds: 120.5, durationSeconds: 1440, watchedEpisodes: [1],
    trackingStatus: 'watching', updatedAt: serverTimestamp(), title: 'Sample Anime',
    coverUrl: 'https://media.example/cover.jpg', totalEpisodes: 12,
  }
  const progressPath = 'users/alice/animeWatchProgress/sample-anime'
  await assertSucceeds(setDoc(doc(alice, progressPath), progress))
  await assertSucceeds(getDoc(doc(alice, progressPath)))
  await assertFails(getDoc(doc(bob, progressPath)))
  await assertFails(setDoc(doc(bob, progressPath), progress))
  await assertFails(setDoc(doc(alice, progressPath), { ...progress, positionSeconds: -1 }))
  await assertFails(setDoc(doc(alice, progressPath), { ...progress, watchedEpisodes: ['episode-1'] }))
  await assertFails(setDoc(doc(alice, progressPath), { ...progress, currentEpisode: 1.5 }))
  await assertFails(setDoc(doc(alice, 'users/alice/animeWatchProgress/wrong-id'), progress))
  await assertSucceeds(setDoc(doc(alice, progressPath), { ...progress, currentEpisode: 3, updatedAt: serverTimestamp() }))
  process.stdout.write('Firestore ownership, catalogue, progress, and settings rules passed.\n')
} finally {
  await environment.cleanup()
}
