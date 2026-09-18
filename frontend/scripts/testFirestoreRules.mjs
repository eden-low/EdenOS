import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'

const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
const environment = await initializeTestEnvironment({ projectId: 'demo-edenos-rules', firestore: { rules } })

try {
  const alice = environment.authenticatedContext('alice').firestore()
  const anotherAliceDevice = environment.authenticatedContext('alice').firestore()
  const bob = environment.authenticatedContext('bob').firestore()
  const guest = environment.unauthenticatedContext().firestore()
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
  await assertFails(setDoc(doc(alice, 'users/alice/exercises/fake'), { ...exercise, estimatedCalories: 999 }))
  await assertFails(setDoc(doc(bob, 'users/alice/exercises/other'), exercise))

  const expense = {
    amountSen: 1234, category: 'food', title: 'Lunch', source: 'manual',
    occurredAt: Timestamp.now(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }
  await assertSucceeds(setDoc(doc(alice, 'users/alice/expenses/lunch'), expense))
  await assertFails(setDoc(doc(bob, 'users/alice/expenses/other'), expense))
  process.stdout.write('Firestore ownership and settings rules passed.\n')
} finally {
  await environment.cleanup()
}
