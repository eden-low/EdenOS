import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
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
import { getGuestDataSummary } from '../repositories/guestAccountRepository'
import { animeProgressStorageKey } from '../services/animeProgressLocalStorage'
import type { GuestDataSummary } from '../types/account'

vi.mock('../lib/firebase', () => ({
  firebaseInitialization: { status: 'ready', services: { auth: {}, firestore: {} } },
}))
vi.mock('../services/firebaseAuthService', () => ({ createFirebaseAuthService: vi.fn() }))
vi.mock('../repositories/guestAccountRepository', () => ({ getGuestDataSummary: vi.fn() }))
const animeProgressRepository = vi.hoisted(() => ({ readAllFromServer: vi.fn() }))
vi.mock('../repositories/firestoreAnimeProgressRepository', () => ({
  createFirestoreAnimeProgressRepository: () => animeProgressRepository,
}))

const guest: AuthIdentity = { uid: 'guest-uid', isAnonymous: true, email: null }
const linked: AuthIdentity = { uid: 'guest-uid', isAnonymous: false, email: 'user@example.com' }
const emptyGuestSummary: GuestDataSummary = {
  expensesCount: 0, exercisesCount: 0, hasBodyWeight: false, hasBudget: false,
  hasSavingsGoal: false, animeProgressCount: 0, animeCloudProgressCount: 0,
  otherBlockingData: [], hasBlockingData: false,
}
const expenseGuestSummary: GuestDataSummary = {
  ...emptyGuestSummary, expensesCount: 1, hasBlockingData: true,
}
let observer: AuthObserver
let service: FirebaseAuthService

function Workspace() {
  const { uid, isAnonymous } = useFirebaseAuth()
  const [sessionValue, setSessionValue] = useState('fresh')
  return (
    <>
      <output data-testid="uid">{uid}</output>
      <output data-testid="account-kind">{isAnonymous ? 'guest' : 'google'}</output>
      <output data-testid="session-value">{sessionValue}</output>
      <button type="button" onClick={() => setSessionValue('guest-state')}>Create session state</button>
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
  localStorage.clear()
  vi.mocked(getGuestDataSummary).mockReset()
  vi.mocked(getGuestDataSummary).mockResolvedValue(expenseGuestSummary)
  animeProgressRepository.readAllFromServer.mockReset()
  animeProgressRepository.readAllFromServer.mockResolvedValue([])
  service = {
    observe: vi.fn(async (next) => { observer = next; return () => undefined }),
    continueAnonymously: vi.fn(async () => guest),
    signInWithGoogle: vi.fn(async () => linked),
    linkGoogle: vi.fn(async () => linked),
    hasPendingGoogleConflict: vi.fn(() => false),
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
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValue(emptyGuestSummary)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Create session state' }))
    expect(screen.getByTestId('session-value').textContent).toBe('guest-state')
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('existing-uid'))
    expect(screen.getByTestId('session-value').textContent).toBe('fresh')
    expect(getGuestDataSummary).toHaveBeenCalledTimes(2)
    expect(service.continueWithExistingGoogle).toHaveBeenCalledWith('guest-uid')
    expect(service.signOutGoogle).not.toHaveBeenCalled()
  })

  it('handles the alternate Firebase account conflict code', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/account-exists-with-different-credential' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValue(emptyGuestSummary)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect(await screen.findByRole('button', { name: 'Continue with existing Google account' })).toBeTruthy()
  })

  it('allows Anime-only Guest progress and preserves legacy cloud progress before switching', async () => {
    const local = {
      externalId: 'sample-anime', animeId: 'sample-anime', currentEpisode: 2,
      positionSeconds: 10, durationSeconds: 100, watchedEpisodes: [1],
      trackingStatus: 'watching', updatedAt: 100, title: 'Sample',
    }
    const cloud = { ...local, currentEpisode: 4, updatedAt: 300 }
    localStorage.setItem(animeProgressStorageKey, JSON.stringify({ version: 1, items: [local] }))
    const animeSummary = {
      ...emptyGuestSummary, animeProgressCount: 1, animeCloudProgressCount: 1,
    }
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValue(animeSummary)
    animeProgressRepository.readAllFromServer.mockResolvedValue([cloud])
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Anime progress on 1 title')
    fireEvent.click(screen.getByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('existing-uid'))
    expect(localStorage.getItem(animeProgressStorageKey)).toContain('"currentEpisode":4')
  })

  it('does not switch a Guest with persisted data', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValue(expenseGuestSummary)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('1 Expense')
    expect(service.continueWithExistingGoogle).not.toHaveBeenCalled()
    expect(screen.getByTestId('uid').textContent).toBe('guest-uid')
  })

  it('keeps a Guest when Firebase supplies no reusable conflict credential', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(false)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    expect((await screen.findByRole('alert')).textContent).toContain('could not verify a safe switch')
    expect(getGuestDataSummary).not.toHaveBeenCalled()
    expect(service.continueWithExistingGoogle).not.toHaveBeenCalled()
  })

  it('rechecks before switching and keeps newly saved Guest data protected', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValueOnce(emptyGuestSummary).mockResolvedValueOnce(expenseGuestSummary)
    renderProvider(); restore(guest)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1 Expense'))
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

  it('can reconnect to the existing Google account after logout creates a new Guest', async () => {
    vi.mocked(service.linkGoogle).mockRejectedValue({ code: 'auth/credential-already-in-use' })
    vi.mocked(service.hasPendingGoogleConflict).mockReturnValue(true)
    vi.mocked(getGuestDataSummary).mockResolvedValue(emptyGuestSummary)
    renderProvider(); restore(linked)
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(screen.getByText('Open your workspace')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue as guest' }))
    await waitFor(() => expect(screen.getByTestId('account-kind').textContent).toBe('guest'))
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google account' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with existing Google account' }))
    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('existing-uid'))
  })
})
