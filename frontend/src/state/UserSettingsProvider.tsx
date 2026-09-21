import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { emptyUserSettings, type UserSettings } from '../domain/userSettings'
import { createFirestoreUserSettingsRepository } from '../repositories/firestoreUserSettingsRepository'
import { UserSettingsContext } from './userSettingsContextDefinition'
import { useFirebaseAuth } from './useFirebaseAuth'

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreUserSettingsRepository(firestore, uid), [firestore, uid])
  const [state, setState] = useState<{ uid: string; settings: UserSettings; status: 'loading' | 'loaded' | 'error' }>(
    { uid, settings: emptyUserSettings, status: 'loading' },
  )

  useEffect(() => {
    return repository.subscribe({
      next(settings) { setState({ uid, settings, status: 'loaded' }) },
      error() { setState({ uid, settings: emptyUserSettings, status: 'error' }) },
    })
  }, [repository, uid])

  const current = state.uid === uid ? state : { uid, settings: emptyUserSettings, status: 'loading' as const }
  async function saveConfirmed<K extends keyof UserSettings>(field: K, value: UserSettings[K], write: () => Promise<void>) {
    await write()
    setState((previous) => previous.uid === uid
      ? { ...previous, status: 'loaded', settings: { ...previous.settings, [field]: value } }
      : previous)
  }
  return (
    <UserSettingsContext.Provider value={{
      settings: current.settings,
      status: current.status,
      saveBodyWeight: (value) => saveConfirmed('bodyWeightKg', value, () => repository.saveBodyWeight(value)),
      saveHeight: (value) => saveConfirmed('heightCm', value, () => repository.saveHeight(value)),
      saveMonthlyBudget: (value) => saveConfirmed('monthlyBudgetSen', value, () => repository.saveMonthlyBudget(value)),
      saveSavingsGoal: (value) => saveConfirmed('savingsGoalSen', value, () => repository.saveSavingsGoal(value)),
    }}>
      {children}
    </UserSettingsContext.Provider>
  )
}
