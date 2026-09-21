import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { emptyUserSettings, type UserSettings } from '../../domain/userSettings'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { SpendingCard } from './SpendingCard'
import { SavingsGoalCard } from './SavingsGoalCard'
import { MoneySettingsDialog } from './MoneySettingsDialog'

function Harness({ initial = emptyUserSettings, fail = false }: { initial?: UserSettings; fail?: boolean }) {
  const [settings, setSettings] = useState(initial)
  const saveMonthlyBudget = vi.fn(async (amountSen: number) => {
    if (fail) throw new Error('write failed')
    setSettings((current) => ({ ...current, monthlyBudgetSen: amountSen }))
  })
  const saveSavingsGoal = vi.fn(async (amountSen: number) => {
    if (fail) throw new Error('write failed')
    setSettings((current) => ({ ...current, savingsGoalSen: amountSen }))
  })
  return <UserSettingsContext.Provider value={{
    settings, status: 'loaded', saveBodyWeight: vi.fn(async () => undefined), saveHeight: vi.fn(async () => undefined), saveMonthlyBudget, saveSavingsGoal,
  }}>
    <SpendingCard spending={{ month: 'September', spentSen: 12345, spentTodaySen: 0 }} finance={{ incomeSen: 0, expenseSen: 12345, netCashflowSen: -12345 }} status="loaded" incomeStatus="loaded" error={null} incomeError={null} onRetry={vi.fn()} onRetryIncome={vi.fn()} />
    <SavingsGoalCard />
    <output data-testid="persisted">{`${settings.monthlyBudgetSen ?? 'none'}:${settings.savingsGoalSen ?? 'none'}`}</output>
  </UserSettingsContext.Provider>
}

describe('Budget and Savings Goal configuration', () => {
  it('keeps the editor pending until the authoritative budget write succeeds', async () => {
    let finish: (() => void) | undefined
    const write = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    render(<UserSettingsContext.Provider value={{
      settings: emptyUserSettings, status: 'loaded', saveBodyWeight: vi.fn(async () => undefined), saveHeight: vi.fn(async () => undefined),
      saveMonthlyBudget: write, saveSavingsGoal: vi.fn(async () => undefined),
    }}><MoneySettingsDialog kind="budget" /></UserSettingsContext.Provider>)
    fireEvent.click(screen.getByRole('button', { name: 'Configure Budget' }))
    fireEvent.change(screen.getByLabelText('Budget amount (RM)'), { target: { value: '20.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Budget' }))
    expect(write).toHaveBeenCalledWith(2025)
    expect(screen.getByRole('button', { name: 'Saving…' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => finish?.())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('creates and edits a monthly budget in integer sen', async () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Configure Budget' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Configure Budget' }))
    fireEvent.change(screen.getByLabelText('Budget amount (RM)'), { target: { value: '200.25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Budget' }))
    await waitFor(() => expect(screen.getByTestId('persisted').textContent).toBe('20025:none'))
    expect(screen.getByText('RM 76.80')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Budget' }))
    expect((screen.getByLabelText('Budget amount (RM)') as HTMLInputElement).value).toBe('200.25')
    fireEvent.change(screen.getByLabelText('Budget amount (RM)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTestId('persisted').textContent).toBe('20025:none')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Budget' }))
    fireEvent.change(screen.getByLabelText('Budget amount (RM)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Budget' }))
    await waitFor(() => expect(screen.getByTestId('persisted').textContent).toBe('30000:none'))
  })

  it('creates and edits a savings target in integer sen', async () => {
    render(<Harness />)
    expect(screen.getByText('Not configured')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Configure Savings Goal' }))
    fireEvent.change(screen.getByLabelText('Savings Goal amount (RM)'), { target: { value: '1500.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Savings Goal' }))
    await waitFor(() => expect(screen.getByTestId('persisted').textContent).toBe('none:150050'))
    expect(screen.getByText('RM 1,500.50')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Savings Goal' }))
    expect((screen.getByLabelText('Savings Goal amount (RM)') as HTMLInputElement).value).toBe('1500.50')
    fireEvent.change(screen.getByLabelText('Savings Goal amount (RM)'), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByTestId('persisted').textContent).toBe('none:150050')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Savings Goal' }))
    fireEvent.change(screen.getByLabelText('Savings Goal amount (RM)'), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Savings Goal' }))
    await waitFor(() => expect(screen.getByTestId('persisted').textContent).toBe('none:200000'))
  })

  it.each(['Budget', 'Savings Goal'] as const)('rejects invalid %s input and keeps the dialog open on write failure', async (label) => {
    render(<Harness fail />)
    fireEvent.click(screen.getByRole('button', { name: `Configure ${label}` }))
    const input = screen.getByLabelText(`${label} amount (RM)`)
    fireEvent.change(input, { target: { value: '1.999' } })
    fireEvent.click(screen.getByRole('button', { name: `Save ${label}` }))
    expect(screen.getByText(/no more than two decimal places/)).toBeTruthy()
    fireEvent.change(input, { target: { value: '10.25' } })
    fireEvent.click(screen.getByRole('button', { name: `Save ${label}` }))
    await waitFor(() => expect(screen.getByText(new RegExp(`Could not save ${label.toLowerCase()}`))).toBeTruthy())
    expect(screen.getByTestId('persisted').textContent).toBe('none:none')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' })))
  })
})
