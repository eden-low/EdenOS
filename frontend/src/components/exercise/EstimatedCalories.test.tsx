import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyUserSettings } from '../../domain/userSettings'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { EstimatedCalories } from './EstimatedCalories'

const exercise = { activity: 'Badminton', durationSeconds: 1800 }
const save = vi.fn(async () => undefined)

function renderWithWeight(weight: number | null) {
  return render(<UserSettingsContext.Provider value={{
    settings: { ...emptyUserSettings, bodyWeightKg: weight }, status: 'loaded',
    saveBodyWeight: save, saveHeight: save, saveMonthlyBudget: save, saveSavingsGoal: save,
  }}><EstimatedCalories exercise={exercise} /></UserSettingsContext.Provider>)
}

describe('Estimated Calories display', () => {
  it('shows an estimate only when weight and a supported activity exist', () => {
    const { rerender } = renderWithWeight(null)
    expect(screen.getByText(/Add body weight in Account/)).toBeTruthy()
    expect(screen.queryByText(/kcal/)).toBeNull()
    rerender(<UserSettingsContext.Provider value={{
      settings: { ...emptyUserSettings, bodyWeightKg: 70 }, status: 'loaded',
      saveBodyWeight: save, saveHeight: save, saveMonthlyBudget: save, saveSavingsGoal: save,
    }}><EstimatedCalories exercise={exercise} /></UserSettingsContext.Provider>)
    expect(screen.getByText('Estimated Calories · 202 kcal')).toBeTruthy()
    expect(exercise).not.toHaveProperty('estimatedCalories')
  })

  it('does not guess for an unsupported activity', () => {
    render(<EstimatedCalories exercise={{ activity: 'Unknown', durationSeconds: 1800 }} />)
    expect(screen.getByText(/unavailable for this activity/)).toBeTruthy()
  })
})
