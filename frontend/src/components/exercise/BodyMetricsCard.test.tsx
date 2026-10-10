import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyUserSettings, type BodyMeasurement } from '../../domain/userSettings'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { BodyMetricsCard } from './BodyMetricsCard'

const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => vi.stubGlobal('crypto', { randomUUID: () => id }))

function Harness({ initialHeight = null, initialWeight = null, initialHistory = [], onSave = vi.fn() }: {
  initialHeight?: number | null; initialWeight?: number | null
  initialHistory?: BodyMeasurement[]; onSave?: (kind: string, value: number) => void
}) {
  const [settings, setSettings] = useState({ ...emptyUserSettings, heightCm: initialHeight, bodyWeightKg: initialWeight })
  const [measurements, setMeasurements] = useState(initialHistory)
  function record(kind: 'height' | 'weight', value: number) {
    onSave(kind, value)
    setSettings((old) => ({ ...old, [kind === 'height' ? 'heightCm' : 'bodyWeightKg']: value }))
    setMeasurements((old) => [{ id: `${id}-${old.length}`, kind, value, recordedAt: '2026-10-09T10:00:00Z' }, ...old])
  }
  return <UserSettingsContext.Provider value={{ settings, measurements, status: 'loaded',
    saveHeight: async (value) => record('height', value), saveBodyWeight: async (value) => record('weight', value),
    saveMonthlyBudget: vi.fn(), saveSavingsGoal: vi.fn() }}><BodyMetricsCard /></UserSettingsContext.Provider>
}

describe('BodyMetricsCard', () => {
  it('shows legacy current values without inventing a dated record', () => {
    render(<Harness initialWeight={68.5} />)
    expect(screen.getByText('68.5 kg')).toBeTruthy()
    expect(screen.getByText('Last recorded date unavailable')).toBeTruthy()
    expect(screen.getAllByText('No dated measurements yet.')).toHaveLength(2)
  })

  it('validates height and saves only the metric deliberately submitted', async () => {
    const onSave = vi.fn()
    render(<Harness initialWeight={60} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add height measurement' }))
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '175.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }))
    expect(screen.getByText(/Enter a height/)).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Height (cm)'), { target: { value: '170' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }))
    await waitFor(() => expect(screen.getAllByText('170 cm')).toHaveLength(2))
    expect(onSave).toHaveBeenCalledExactlyOnceWith('height', 170)
    expect(screen.getByText('20.8')).toBeTruthy()
  })

  it('records an equal manual weight and shows No Change without a new-day placeholder', async () => {
    const onSave = vi.fn()
    render(<Harness initialWeight={68.5} initialHistory={[
      { id: 'old', kind: 'weight', value: 68.5, recordedAt: '2026-10-08T10:00:00Z' },
    ]} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add weight measurement' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save measurement' }))
    await waitFor(() => expect(screen.getByText('No Change')).toBeTruthy())
    expect(onSave).toHaveBeenCalledExactlyOnceWith('weight', 68.5)
    expect(screen.getByText(/Last recorded 9 Oct 2026/)).toBeTruthy()
    expect(screen.queryByText(/10 Oct 2026/)).toBeNull()
  })
})
