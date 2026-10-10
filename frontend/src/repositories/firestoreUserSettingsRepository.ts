import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import { emptyUserSettings, isValidBodyWeightKg, isValidHeightCm, isValidSettingsAmountSen, type BodyMeasurement, type UserSettings } from '../domain/userSettings'
import type { UserSettingsRepository } from './userSettingsRepository'

export function createFirestoreUserSettingsRepository(firestore: Firestore, uid: string): UserSettingsRepository {
  const reference = doc(firestore, 'users', uid, 'settings', 'preferences')
  const measurements = collection(firestore, 'users', uid, 'bodyMeasurements')

  async function saveMeasurement(kind: BodyMeasurement['kind'], value: number, measurementId?: string) {
    const id = measurementId ?? crypto.randomUUID()
    if (!/^[\da-f-]{36}$/i.test(id)) throw new Error('Invalid measurement ID.')
    const measurement = doc(measurements, id)
    await runTransaction(firestore, async (transaction) => {
      const existing = await transaction.get(measurement)
      if (existing.exists()) {
        const data = existing.data()
        if (data.kind !== kind || data.value !== value) throw new Error('Measurement ID conflict.')
        return
      }
      transaction.set(measurement, { kind, value, recordedAt: serverTimestamp() })
      transaction.set(reference, {
        [kind === 'weight' ? 'bodyWeightKg' : 'heightCm']: value,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    })
  }

  return {
    subscribe(observer) {
      return onSnapshot(reference, { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
        if (!snapshot.exists()) {
          observer.next(emptyUserSettings)
          return
        }
        const data = snapshot.data()
        const settings: UserSettings = {
          bodyWeightKg: isValidBodyWeightKg(data.bodyWeightKg) ? data.bodyWeightKg : null,
          heightCm: isValidHeightCm(data.heightCm) ? data.heightCm : null,
          monthlyBudgetSen: isValidSettingsAmountSen(data.monthlyBudgetSen) ? data.monthlyBudgetSen : null,
          savingsGoalSen: isValidSettingsAmountSen(data.savingsGoalSen) ? data.savingsGoalSen : null,
        }
        observer.next(settings)
      }, observer.error)
    },
    subscribeMeasurements(observer) {
      return onSnapshot(query(measurements, orderBy('recordedAt', 'desc')),
        { includeMetadataChanges: true }, (snapshot) => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
          const rows: BodyMeasurement[] = []
          for (const item of snapshot.docs) {
            const data = item.data()
            const date = data.recordedAt?.toDate?.()
            if ((data.kind === 'weight' && isValidBodyWeightKg(data.value) ||
              data.kind === 'height' && isValidHeightCm(data.value)) &&
              date instanceof Date && Number.isFinite(date.getTime())) {
              rows.push({ id: item.id, kind: data.kind, value: data.value, recordedAt: date.toISOString() })
            }
          }
          observer.next(rows)
        }, observer.error)
    },
    async saveBodyWeight(bodyWeightKg, measurementId) {
      if (!isValidBodyWeightKg(bodyWeightKg)) throw new Error('Enter a body weight from 20 to 500 kg, to one decimal place.')
      await saveMeasurement('weight', bodyWeightKg, measurementId)
    },
    async saveHeight(heightCm, measurementId) {
      if (!isValidHeightCm(heightCm)) throw new Error('Enter a height from 80 to 250 cm as a whole number.')
      await saveMeasurement('height', heightCm, measurementId)
    },
    async saveMonthlyBudget(amountSen) {
      if (!isValidSettingsAmountSen(amountSen)) throw new Error('Enter a valid monthly budget.')
      await setDoc(reference, { monthlyBudgetSen: amountSen, updatedAt: serverTimestamp() }, { merge: true })
    },
    async saveSavingsGoal(amountSen) {
      if (!isValidSettingsAmountSen(amountSen)) throw new Error('Enter a valid savings goal.')
      await setDoc(reference, { savingsGoalSen: amountSen, updatedAt: serverTimestamp() }, { merge: true })
    },
  }
}
