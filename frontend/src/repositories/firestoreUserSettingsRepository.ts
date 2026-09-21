import { doc, onSnapshot, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import { emptyUserSettings, isValidBodyWeightKg, isValidHeightCm, isValidSettingsAmountSen, type UserSettings } from '../domain/userSettings'
import type { UserSettingsRepository } from './userSettingsRepository'

export function createFirestoreUserSettingsRepository(firestore: Firestore, uid: string): UserSettingsRepository {
  const reference = doc(firestore, 'users', uid, 'settings', 'preferences')

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
    async saveBodyWeight(bodyWeightKg) {
      if (!isValidBodyWeightKg(bodyWeightKg)) throw new Error('Enter a body weight from 20 to 500 kg, to one decimal place.')
      await setDoc(reference, { bodyWeightKg, updatedAt: serverTimestamp() }, { merge: true })
    },
    async saveHeight(heightCm) {
      if (!isValidHeightCm(heightCm)) throw new Error('Enter a height from 80 to 250 cm as a whole number.')
      await setDoc(reference, { heightCm, updatedAt: serverTimestamp() }, { merge: true })
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
