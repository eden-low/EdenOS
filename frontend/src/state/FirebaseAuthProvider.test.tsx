import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountDialog } from '../components/account/AccountDialog'
import {
  createFirebaseAuthService,
  type AuthIdentity,
  type AuthObserver,
  type FirebaseAuthService,
} from '../services/firebaseAuthService'
import { FirebaseAuthProvider } from './FirebaseAuthProvider'
import { useFirebaseAuth } from './useFirebaseAuth'
import { UserSettingsContext } from './userSettingsContextDefinition'
import { emptyUserSettings } from '../domain/userSettings'
import { guestHasMeaningfulData } from '../repositories/guestAccountRepository'

vi.mock('../lib/firebase', () => ({
  firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } },
}))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))
vi.mock('../repositories/guestAccountRepository', () => ({ guestHasMeaningfulData: vi.fn(async () => true) }))

const guest: AuthIdentity = { uid: 'guest-uid', isAnonymous: true, email: null }
const linked: AuthIdentity = { uid: 'guest-uid', isAnonymous: false, email: 'user@example.com' }
let observer: AuthObserver
let service: FirebaseAuthService

function Workspace() {
  const { uid, isAnonymous } = useFirebaseAuth()
  return (
    <>
      <output data-testid="uid">{uid}</output>
      <output data-testid="account-kind">{isAnonymous ? 'guest' : 'google'}</output>
      <UserSettingsContext.Provider value={{
        settings: emptyUserSettings, status: 'loaded',
        saveBodyWeight: vi.fn(async () => undefined), saveMonthlyBudget: vi.fn(async () => undefined), saveSavingsGoal: vi.fn(async () => undefined),
      }}><AccountDialog><button type="button">Account</button></AccountDialog></UserSettingsContext.Provider>
    </>
  )
}

function renderProvider() {
  render(<FirebaseAuthProvider><Workspace /></FirebaseAuthProvider>)
  expect(createFirebaseAuthService).toHaveBeenCalledOnce()
}

function restore(identity: AuthIdentity | null) {
  act(() => { observer.next(identity) })
}

beforeEach(() => {
  vi.mocked(guestHasMeaningfulData).mockReset()
  vi.mocked(guestHasMeaningfulData).mockResolvedValue(true)
  service = {
    observe: vi.fn(async (next) => { observer = next; return () => undefined }),
    continueAnonymously: vi.fn(async () => guest),
    signInWithGoogle: vi.fn(async () => linked),
    linkGoogle: vi.fn(async () => linked),
    hasConflictingGoogleCredential: vi.fn(() => false),
    discardConflictingGoogleCredential: vi.fn(),
    continueWithExistingGoogle: vi.fn(async () => ({ uid: 'existing-uid', isAnonymous: false, email: 'user@example.com' })),
    signOutGoogle: vi.fn(async () => undefined),
  }
  vi.mocked(createFirebaseAuthService).mockReturnValue(service)
})

describe('Firebase Auth startup and account UI', () => {
  it('stays initializing until the restored auth state is known', () => {
    renderProvider()
    expect(screen.getByText('Opening your private workspace')).toBeTruthy()
    expect(screen.queryByText('Open your workspace')).toBeNull()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
  })

  it('restores an existing anonymous session without creating another user', () => {
    renderProvider()
    restore(guest)
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByText('Guest')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
    expect(service.signOutGoogle).not.toHaveBeenCalled()
  })

  it('restores an existing Google session', () => {
    renderProvider()
    restore(linked)
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByText('Google connected')).toBeTruthy()
    expect(screen.getByText('user@example.com')).toBeTruthy()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
  })

  it('links a guest and keeps the same UID', async () => {
    renderProvider()
    restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))

    await waitFor(() => expect(screen.getByTestId('account-kind').textContent).toBe('google'))
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
    expect(service.linkGoogle).toHaveBeenCalledWith('guest-uid')
    expect(service.signInWithGoogle).not.toHaveBeenCalled()
    expect(service.signOutGoogle).not.toHaveBeenCalled()
  })

  it('treats a cancelled popup as no change to the guest session', async () => {
    vi.mocked(service.linkGoogle).mockResolvedValue(null)
    renderProvider()
    restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Connect Google account' })).toBeTruthy())
    expect(screen.getByTestId('account-kind').textContent).toBe('guest')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['auth/popup-blocked', 'Allow popups'],
    ['auth/network-request-failed', 'connection was interrupted'],
  ])('keeps the guest session after %s', async (code, message) => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code })
    renderProvider()
    restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(message))
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
    expect(screen.getByTestId('account-kind').textContent).toBe('guest')
    expect(service.signInWithGoogle).not.toHaveBeenCalled()
    expect(service.signOutGoogle).not.toHaveBeenCalled()
  })

  it('switches an empty Guest to the existing Google UID without linking or merging', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasConflictingGoogleCredential).mockReturnValue(true)
    vi.mocked(guestHasMeaningfulData).mockResolvedValue(false)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('existing-uid'))
    expect(guestHasMeaningfulData).toHaveBeenCalledTimes(2)
    expect(service.continueWithExistingGoogle).toHaveBeenCalledWith('guest-uid')
    expect(service.signOutGoogle).not.toHaveBeenCalled()
  })

  it('does not switch a Guest with persisted data', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasConflictingGoogleCredential).mockReturnValue(true)
    vi.mocked(guestHasMeaningfulData).mockResolvedValue(true)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('This Guest has saved data')
    expect(service.continueWithExistingGoogle).not.toHaveBeenCalled()
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
  })

  it('keeps a Guest when Firebase supplies no reusable conflict credential', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasConflictingGoogleCredential).mockReturnValue(false)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('could not verify a safe switch')
    expect(guestHasMeaningfulData).not.toHaveBeenCalled()
    expect(service.continueWithExistingGoogle).not.toHaveBeenCalled()
  })

  it('rechecks before switching and keeps newly saved Guest data protected', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasConflictingGoogleCredential).mockReturnValue(true)
    vi.mocked(guestHasMeaningfulData).mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('now has data'))
    expect(service.continueWithExistingGoogle).not.toHaveBeenCalled()
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
  })

  it('offers Google sign-in only after an unauthenticated state is observed', async () => {
    renderProvider()
    restore(null)
    expect(screen.getByText('Open your workspace')).toBeTruthy()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))

    await waitFor(() => expect(screen.getByTestId('account-kind').textContent).toBe('google'))
    expect(service.signInWithGoogle).toHaveBeenCalledOnce()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
  })

  it('returns to the account choice after cancelling Google sign-in', async () => {
    vi.mocked(service.signInWithGoogle).mockResolvedValue(null)
    renderProvider()
    restore(null)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeTruthy())
    expect(screen.getByText('Open your workspace')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
  })

  it('starts anonymous auth only when the user chooses it', async () => {
    renderProvider()
    restore(null)
    expect(service.continueAnonymously).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }))

    await waitFor(() => expect(screen.getByTestId('account-kind').textContent).toBe('guest'))
    expect(service.continueAnonymously).toHaveBeenCalledOnce()
    expect(service.signInWithGoogle).not.toHaveBeenCalled()
  })

  it('signs out a Google user without silently creating a guest', async () => {
    renderProvider()
    restore(linked)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(screen.getByText('Open your workspace')).toBeTruthy())
    expect(service.signOutGoogle).toHaveBeenCalledOnce()
    expect(service.continueAnonymously).not.toHaveBeenCalled()
  })
})
