import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { emptyUserSettings } from '../../domain/userSettings'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { BodyWeightSettings } from './BodyWeightSettings'

function Harness({ fail = false }: { fail?: boolean }) {
  const [weight, setWeight] = useState<number | null>(null)
  return <UserSettingsContext.Provider value={{
    settings: { ...emptyUserSettings, bodyWeightKg: weight }, status: 'loaded',
    saveBodyWeight: async (value) => { if (fail) throw new Error('write failed'); setWeight(value) },
    saveMonthlyBudget: vi.fn(async () => undefined), saveSavingsGoal: vi.fn(async () => undefined),
  }}>
    <BodyWeightSettings />
    <output data-testid="weight">{weight ?? 'none'}</output>
  </UserSettingsContext.Provider>
}

describe('body weight settings', () => {
  it('adds and edits weight, while cancel leaves it unchanged', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add body weight' }))
    fireEvent.change(screen.getByLabelText('Body weight (kg)'), { target: { value: '70.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weight' }))
    await waitFor(() => expect(screen.getByTestId('weight').textContent).toBe('70.5'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit body weight' }))
    expect((screen.getByLabelText('Body weight (kg)') as HTMLInputElement).value).toBe('70.5')
    fireEvent.change(screen.getByLabelText('Body weight (kg)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTestId('weight').textContent).toBe('70.5')
    fireEvent.click(screen.getByRole('button', { name: 'Edit body weight' }))
    fireEvent.change(screen.getByLabelText('Body weight (kg)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weight' }))
    await waitFor(() => expect(screen.getByTestId('weight').textContent).toBe('80'))
  })

  it('rejects invalid values and keeps failed saves editable', async () => {
    render(<Harness fail />)
    fireEvent.click(screen.getByRole('button', { name: 'Add body weight' }))
    fireEvent.change(screen.getByLabelText('Body weight (kg)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weight' }))
    expect(screen.getByText(/20 to 500 kg/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Body weight (kg)'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save weight' }))
    await waitFor(() => expect(screen.getByText('Could not save body weight. Try again.')).toBeTruthy())
    expect(screen.getByTestId('weight').textContent).toBe('none')
  })
})
