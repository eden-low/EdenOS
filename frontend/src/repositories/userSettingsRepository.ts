import type { BodyMeasurement, UserSettings } from '../domain/userSettings'

export interface UserSettingsRepository {
  subscribe: (observer: { next: (settings: UserSettings) => void; error: (error: unknown) => void }) => () => void
  subscribeMeasurements: (observer: { next: (measurements: BodyMeasurement[]) => void; error: (error: unknown) => void }) => () => void
  saveBodyWeight: (bodyWeightKg: number, measurementId?: string) => Promise<void>
  saveHeight: (heightCm: number, measurementId?: string) => Promise<void>
  saveMonthlyBudget: (amountSen: number) => Promise<void>
  saveSavingsGoal: (amountSen: number) => Promise<void>
}
