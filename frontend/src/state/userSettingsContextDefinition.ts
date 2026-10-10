import { createContext } from 'react'
import type { BodyMeasurement, UserSettings } from '../domain/userSettings'

export interface UserSettingsContextValue {
  settings: UserSettings
  measurements?: BodyMeasurement[]
  status: 'loading' | 'loaded' | 'error'
  saveBodyWeight: (bodyWeightKg: number, measurementId?: string) => Promise<void>
  saveHeight: (heightCm: number, measurementId?: string) => Promise<void>
  saveMonthlyBudget: (amountSen: number) => Promise<void>
  saveSavingsGoal: (amountSen: number) => Promise<void>
}

export const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)
