import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { AccountDialog } from './AccountDialog'
import { UserSettingsContext } from '../../state/userSettingsContextDefinition'
import { emptyUserSettings } from '../../domain/userSettings'

vi.mock('../../state/useFirebaseAuth', () => ({ useFirebaseAuth: vi.fn() }))

const connectGoogle = vi.fn()
const signOutGoogle = vi.fn()
const continueWithExistingGoogle = vi.fn()
const discardExistingGoogleChoice = vi.fn()

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
    connectGoogle.mockResolvedValue('existing-with-data')
    const trigger = renderAccount()

    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('This Guest has saved data')
    expect(screen.queryByRole('button', { name: 'Continue with existing Google account' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    expect(signOutGoogle).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('offers an explicit existing-account action only for an empty Guest', async () => {
    connectGoogle.mockResolvedValue('existing-empty')
    renderAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect(await screen.findByRole('button', { name: 'Continue with existing Google account' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(continueWithExistingGoogle).toHaveBeenCalledOnce())
    expect(signOutGoogle).not.toHaveBeenCalled()
  })

  it('keeps the Guest dialog available if existing-account sign-in fails', async () => {
    connectGoogle.mockResolvedValue('existing-empty')
    continueWithExistingGoogle.mockRejectedValue({ code: 'auth/network-request-failed' })
    renderAccount()
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('connection was interrupted'))
    expect(screen.getByText('Guest')).toBeTruthy()
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
