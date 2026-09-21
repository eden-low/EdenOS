import { createContext } from 'react'
import type { UserSettings } from '../domain/userSettings'

export interface UserSettingsContextValue {
  settings: UserSettings
  status: 'loading' | 'loaded' | 'error'
  saveBodyWeight: (bodyWeightKg: number) => Promise<void>
  saveHeight: (heightCm: number) => Promise<void>
  saveMonthlyBudget: (amountSen: number) => Promise<void>
  saveSavingsGoal: (amountSen: number) => Promise<void>
}

export const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)
