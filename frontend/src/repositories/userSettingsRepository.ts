import type { UserSettings } from '../domain/userSettings'

export interface UserSettingsRepository {
  subscribe: (observer: { next: (settings: UserSettings) => void; error: (error: unknown) => void }) => () => void
  saveBodyWeight: (bodyWeightKg: number) => Promise<void>
  saveMonthlyBudget: (amountSen: number) => Promise<void>
  saveSavingsGoal: (amountSen: number) => Promise<void>
}
