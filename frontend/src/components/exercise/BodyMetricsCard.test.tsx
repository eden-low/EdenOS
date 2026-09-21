import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { emptyUserSettings } from '../../domain/userSettings'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { BodyMetricsCard } from './BodyMetricsCard'

function Harness({ initialHeight = null, initialWeight = null }: { initialHeight?: number | null; initialWeight?: number | null }) {
  const [settings, setSettings] = useState({ ...emptyUserSettings, heightCm: initialHeight, bodyWeightKg: initialWeight })
  return <UserSettingsContext.Provider value={{ settings, status: 'loaded', saveHeight: async (heightCm) => setSettings((value) => ({ ...value, heightCm })), saveBodyWeight: async (bodyWeightKg) => setSettings((value) => ({ ...value, bodyWeightKg })), saveMonthlyBudget: vi.fn(), saveSavingsGoal: vi.fn() }}><BodyMetricsCard /></UserSettingsContext.Provider>
}

describe('BodyMetricsCard', () => {
  it('shows the useful missing-data state', () => {
    render(<Harness />)
    expect(screen.getByText('Add height and weight to calculate BMI.')).toBeTruthy()
  })

  it('validates and saves height with the existing weight model', async () => {
    render(<Harness initialWeight={60} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '175.5' } })
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save metrics' }))
    expect(screen.getByText(/Enter a height/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '170' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save metrics' }))
    await waitFor(() => expect(screen.getByText('170 cm')).toBeTruthy())
    expect(screen.getByText('20.8')).toBeTruthy()
    expect(screen.getByText('Healthy range')).toBeTruthy()
  })
})
