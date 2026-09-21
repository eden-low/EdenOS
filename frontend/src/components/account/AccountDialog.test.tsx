import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { AccountDialog } from './AccountDialog'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { emptyUserSettings } from '../../domain/userSettings'
import type { GuestDataSummary } from '../../types/account'

vi.mock('../../state/useFirebaseAuth', () => ({ useFirebaseAuth: vi.fn() }))
vi.mock('./ThemeSettings', () => ({ ThemeSettings: () => null }))
vi.mock('./PrivacyLockSettings', () => ({ PrivacyLockSettings: () => null }))

const connectGoogle = vi.fn()
const signOutGoogle = vi.fn()
const continueWithExistingGoogle = vi.fn()
const discardExistingGoogleChoice = vi.fn()
const emptySummary: GuestDataSummary = {
  expensesCount: 0, incomesCount: 0, exercisesCount: 0, hasBodyWeight: false, hasBudget: false,
  hasSavingsGoal: false, animeProgressCount: 0, animeCloudProgressCount: 0,
  otherBlockingData: [], hasBlockingData: false,
}

function renderAccount(isAnonymous = true, email: string | null = null) {
  vi.mocked(useFirebaseAuth).mockReturnValue({
    isAnonymous,
    email,
    connectGoogle,
    continueWithExistingGoogle,
    discardExistingGoogleChoice,
    signOutGoogle,
  } as unknown as ReturnType<typeof useFirebaseAuth>)
  render(<UserSettingsContext.Provider value={{
    settings: emptyUserSettings, status: 'loaded',
    saveBodyWeight: vi.fn(async () => undefined), saveMonthlyBudget: vi.fn(async () => undefined), saveSavingsGoal: vi.fn(async () => undefined),
  }}><AccountDialog><button type="button">Open account</button></AccountDialog></UserSettingsContext.Provider>)
  const trigger = screen.getByRole('button', { name: 'Open account' })
  fireEvent.click(trigger)
  return trigger
}

beforeEach(() => {
  connectGoogle.mockReset()
  signOutGoogle.mockReset()
  continueWithExistingGoogle.mockReset()
  continueWithExistingGoogle.mockResolvedValue({ status: 'connected' })
  discardExistingGoogleChoice.mockReset()
})

describe('Account dialog presentation', () => {
  it('shows the guest status and returns focus when closed', async () => {
    const trigger = renderAccount()
    const dialog = screen.getByRole('dialog', { name: 'Account' })

    expect(dialog.className).toContain('account-dialog')
    expect(dialog.textContent).toContain('Current status')
    expect(dialog.textContent).toContain('Guest')
    expect(screen.getByRole('button', { name: 'Connect Google account' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps a Guest with data protected and prioritizes exit', async () => {
    connectGoogle.mockResolvedValue({
      status: 'existing-account',
      summary: {
        ...emptySummary, expensesCount: 2, hasBudget: true, animeProgressCount: 3,
        hasBlockingData: true,
      },
    })
    const trigger = renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('2 Expenses')
    expect(alert.textContent).toContain('Budget configured')
    expect(alert.textContent).toContain('Anime progress on 3 titles')
    expect(alert.textContent).toContain('Your Guest records are being kept safe')
    expect(screen.queryByRole('button', { name: 'Continue with existing Google account' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    expect(signOutGoogle).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('offers an explicit existing-account action only for an empty Guest', async () => {
    connectGoogle.mockResolvedValue({ status: 'existing-account', summary: emptySummary })
    renderAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect(await screen.findByRole('button', { name: 'Continue with existing Google account' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(continueWithExistingGoogle).toHaveBeenCalledOnce())
    expect(signOutGoogle).not.toHaveBeenCalled()
  })

  it('keeps the Guest dialog available if existing-account sign-in fails', async () => {
    connectGoogle.mockResolvedValue({ status: 'existing-account', summary: emptySummary })
    continueWithExistingGoogle.mockRejectedValue({ code: 'auth/network-request-failed' })
    renderAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByText(/connection was interrupted/)).toBeTruthy())
    expect(screen.getByText('Guest')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue with existing Google account' })).toBeTruthy()
  })

  it('does not let Anime-only progress block the existing account action', async () => {
    connectGoogle.mockResolvedValue({
      status: 'existing-account',
      summary: { ...emptySummary, animeProgressCount: 4 },
    })
    renderAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Anime progress on 4 titles')
    expect(alert.textContent).toContain('will remain and reconcile')
    expect(screen.getByRole('button', { name: 'Continue with existing Google account' })).toBeTruthy()
  })

  it('renders an existing Google-linked status without changing its action', () => {
    renderAccount(false, 'alex@example.com')

    const dialog = screen.getByRole('dialog', { name: 'Account' })
    expect(dialog.textContent).toContain('Google connected')
    expect(dialog.textContent).toContain('alex@example.com')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect Google account' })).toBeNull()
  })
})
