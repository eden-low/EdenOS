export interface UserSettings {
  bodyWeightKg: number | null
  heightCm: number | null
  monthlyBudgetSen: number | null
  savingsGoalSen: number | null
}

export const emptyUserSettings: UserSettings = {
  bodyWeightKg: null,
  heightCm: null,
  monthlyBudgetSen: null,
  savingsGoalSen: null,
}

export function isValidHeightCm(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 80 && value <= 250
}

export function parseHeightCm(input: string): number | null {
  const value = input.trim()
  if (!/^\d{2,3}$/.test(value)) return null
  const height = Number(value)
  return isValidHeightCm(height) ? height : null
}

// Adult Compendium estimates and a bounded profile input. Keep one decimal kg.
export function isValidBodyWeightKg(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 500 &&
    Math.round(value * 10) === value * 10
}

export function parseBodyWeightKg(input: string): number | null {
  const value = input.trim()
  if (!/^(?:\d{2,3})(?:\.\d)?$/.test(value)) return null
  const weight = Number(value)
  return isValidBodyWeightKg(weight) ? weight : null
}

export function isValidSettingsAmountSen(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
