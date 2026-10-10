import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { emptyUserSettings, type BodyMeasurement, type UserSettings } from '../domain/userSettings'
import { createFirestoreUserSettingsRepository } from '../repositories/firestoreUserSettingsRepository'
import { UserSettingsContext } from './userSettingsContextDefinition'
import { useFirebaseAuth } from './useFirebaseAuth'

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreUserSettingsRepository(firestore, uid), [firestore, uid])
  const [state, setState] = useState<{ uid: string; settings: UserSettings; status: 'loading' | 'loaded' | 'error' }>(
    { uid, settings: emptyUserSettings, status: 'loading' },
  )
  const [history, setHistory] = useState<{ uid: string; measurements: BodyMeasurement[] }>({ uid, measurements: [] })

  useEffect(() => {
    return repository.subscribe({
      next(settings) { setState({ uid, settings, status: 'loaded' }) },
      error() { setState({ uid, settings: emptyUserSettings, status: 'error' }) },
    })
  }, [repository, uid])

  useEffect(() => repository.subscribeMeasurements({
    next(measurements) { setHistory({ uid, measurements }) },
    error() { setHistory({ uid, measurements: [] }) },
  }), [repository, uid])

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
      measurements: history.uid === uid ? history.measurements : [],
      status: current.status,
      saveBodyWeight: (value, id) => saveConfirmed('bodyWeightKg', value, () => repository.saveBodyWeight(value, id)),
      saveHeight: (value, id) => saveConfirmed('heightCm', value, () => repository.saveHeight(value, id)),
      saveMonthlyBudget: (value) => saveConfirmed('monthlyBudgetSen', value, () => repository.saveMonthlyBudget(value)),
      saveSavingsGoal: (value) => saveConfirmed('savingsGoalSen', value, () => repository.saveSavingsGoal(value)),
    }}>
      {children}
    </UserSettingsContext.Provider>
  )
}
