import type { Auth, User } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFirebaseAuthService } from './firebaseAuthService'

const sdk = vi.hoisted(() => ({
  setPersistence: vi.fn(async () => undefined),
  onAuthStateChanged: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithPopup: vi.fn(),
  linkWithPopup: vi.fn(),
  signOut: vi.fn(async () => undefined),
  signInWithCredential: vi.fn(),
  credentialFromError: vi.fn((): { providerId: string } | null => ({ providerId: 'google.com' })),
}))

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: { type: 'LOCAL' },
  GoogleAuthProvider: class GoogleAuthProvider { static credentialFromError = sdk.credentialFromError },
  ...sdk,
}))

const guest = { uid: 'original-uid', isAnonymous: true, email: null } as User
const google = { uid: 'original-uid', isAnonymous: false, email: 'user@example.com' } as User
let auth: Auth

beforeEach(() => {
  vi.clearAllMocks()
  auth = { currentUser: null } as unknown as Auth
  sdk.onAuthStateChanged.mockReturnValue(vi.fn())
})

describe('Firebase auth adapter', () => {
  it('waits for browser-local persistence before observing restored sessions', async () => {
    const next = vi.fn()
    const service = createFirebaseAuthService(auth)
    await service.observe({ next, error: vi.fn() })

    expect(sdk.setPersistence).toHaveBeenCalledWith(auth, { type: 'LOCAL' })
    expect(sdk.onAuthStateChanged).toHaveBeenCalledWith(auth, expect.any(Function), expect.any(Function))
    const onUser = sdk.onAuthStateChanged.mock.calls[0][1] as (user: User | null) => void
    onUser(guest)
    onUser(google)
    onUser(null)
    expect(next.mock.calls.map(([identity]) => identity)).toEqual([
      { uid: 'original-uid', isAnonymous: true, email: null },
      { uid: 'original-uid', isAnonymous: false, email: 'user@example.com' },
      null,
    ])
    expect(sdk.signInAnonymously).not.toHaveBeenCalled()
  })

  it('links Google to the current anonymous user without signing in as a different user', async () => {
    auth = { currentUser: guest } as Auth
    sdk.linkWithPopup.mockResolvedValue({ user: google })
    const identity = await createFirebaseAuthService(auth).linkGoogle(guest.uid)

    expect(identity).toEqual({ uid: guest.uid, isAnonymous: false, email: 'user@example.com' })
    expect(sdk.linkWithPopup).toHaveBeenCalledWith(guest, expect.anything())
    expect(sdk.signInWithPopup).not.toHaveBeenCalled()
    expect(sdk.signOut).not.toHaveBeenCalled()
    expect(auth.currentUser).toBe(guest)
  })

  it('leaves the guest identity intact after cancellation or an account conflict', async () => {
    auth = { currentUser: guest } as Auth
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' })
    expect(await service.linkGoogle(guest.uid)).toBeNull()
    sdk.linkWithPopup.mockRejectedValueOnce({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toMatchObject({ code: 'auth/credential-already-in-use' })
    expect(auth.currentUser).toBe(guest)
    expect(sdk.signInWithPopup).not.toHaveBeenCalled()
    expect(sdk.signOut).not.toHaveBeenCalled()
  })

  it('uses the conflict credential only after explicit confirmation and enters the existing UID', async () => {
    auth = { currentUser: guest } as Auth
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toMatchObject({ code: 'auth/credential-already-in-use' })
    expect(service.hasPendingGoogleConflict()).toBe(true)
    const existing = { uid: 'existing-uid', isAnonymous: false, email: 'user@example.com' } as User
    sdk.signInWithCredential.mockResolvedValue({ user: existing })
    expect(await service.continueWithExistingGoogle(guest.uid)).toMatchObject({ uid: 'existing-uid' })
    expect(sdk.signInWithCredential).toHaveBeenCalledWith(auth, expect.objectContaining({ providerId: 'google.com' }))
    expect(sdk.signOut).not.toHaveBeenCalled()
  })

  it('leaves the Guest intact if existing-account sign-in fails', async () => {
    auth = { currentUser: guest } as Auth
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toBeTruthy()
    sdk.signInWithCredential.mockRejectedValue({ code: 'auth/network-request-failed' })
    await expect(service.continueWithExistingGoogle(guest.uid)).rejects.toMatchObject({ code: 'auth/network-request-failed' })
    expect(auth.currentUser).toBe(guest)
    expect(sdk.signOut).not.toHaveBeenCalled()
    const existing = { uid: 'existing-uid', isAnonymous: false, email: 'user@example.com' } as User
    sdk.signInWithCredential.mockResolvedValue({ user: existing })
    await expect(service.continueWithExistingGoogle(guest.uid)).resolves.toMatchObject({ uid: 'existing-uid' })
  })

  it('rejects a stale Guest or missing conflict choice before switching', async () => {
    auth = { currentUser: guest } as Auth
    const service = createFirebaseAuthService(auth)
    await expect(service.continueWithExistingGoogle(guest.uid)).rejects.toThrow('no longer available')
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toBeTruthy()
    await expect(service.continueWithExistingGoogle('different-guest')).rejects.toThrow('no longer available')
    service.discardConflictingGoogleCredential()
    expect(service.hasPendingGoogleConflict()).toBe(false)
    expect(sdk.signInWithCredential).not.toHaveBeenCalled()
  })

  it('recognizes account-exists-with-different-credential as an existing account conflict', async () => {
    auth = { currentUser: guest } as Auth
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/account-exists-with-different-credential' })
    await expect(service.linkGoogle(guest.uid)).rejects.toMatchObject({
      code: 'auth/account-exists-with-different-credential',
    })
    expect(service.hasPendingGoogleConflict()).toBe(true)
  })

  it('uses one fresh popup only when Firebase supplies no reusable credential', async () => {
    auth = { currentUser: guest } as Auth
    sdk.credentialFromError.mockReturnValueOnce(null)
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toBeTruthy()
    const existing = { uid: 'existing-uid', isAnonymous: false, email: 'user@example.com' } as User
    sdk.signInWithPopup.mockResolvedValue({ user: existing })
    await expect(service.continueWithExistingGoogle(guest.uid)).resolves.toMatchObject({ uid: 'existing-uid' })
    expect(sdk.signInWithCredential).not.toHaveBeenCalled()
    expect(sdk.signInWithPopup).toHaveBeenCalledOnce()
  })

  it('keeps the pending conflict after cancelling a required fresh popup', async () => {
    auth = { currentUser: guest } as Auth
    sdk.credentialFromError.mockReturnValueOnce(null)
    const service = createFirebaseAuthService(auth)
    sdk.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' })
    await expect(service.linkGoogle(guest.uid)).rejects.toBeTruthy()
    sdk.signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' })
    await expect(service.continueWithExistingGoogle(guest.uid)).resolves.toBeNull()
    expect(service.hasPendingGoogleConflict()).toBe(true)
    expect(auth.currentUser).toBe(guest)
  })

  it('rejects a link result with a different UID', async () => {
    auth = { currentUser: guest } as Auth
    sdk.linkWithPopup.mockResolvedValue({
      user: { uid: 'different-uid', isAnonymous: false, email: 'user@example.com' },
    })
    await expect(createFirebaseAuthService(auth).linkGoogle(guest.uid))
      .rejects.toThrow('could not be verified')
    expect(sdk.signInWithPopup).not.toHaveBeenCalled()
  })

  it('allows Google sign-in only when there is no current user', async () => {
    sdk.signInWithPopup.mockResolvedValue({ user: google })
    const service = createFirebaseAuthService(auth)
    expect(await service.signInWithGoogle()).toMatchObject({ uid: google.uid, isAnonymous: false })
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(auth, expect.anything())

    auth = { currentUser: guest } as Auth
    await expect(createFirebaseAuthService(auth).signInWithGoogle()).rejects.toThrow('unauthenticated')
  })

  it('creates a guest only after an explicit choice and never signs a guest out', async () => {
    sdk.signInAnonymously.mockResolvedValue({ user: guest })
    const service = createFirebaseAuthService(auth)
    expect(await service.continueAnonymously()).toMatchObject({ uid: guest.uid, isAnonymous: true })
    expect(sdk.signInAnonymously).toHaveBeenCalledWith(auth)

    auth = { currentUser: guest } as Auth
    await expect(createFirebaseAuthService(auth).signOutGoogle()).rejects.toThrow('cannot be signed out')
    expect(sdk.signOut).not.toHaveBeenCalled()
  })

  it('signs out a linked Google user', async () => {
    auth = { currentUser: google } as Auth
    await createFirebaseAuthService(auth).signOutGoogle()
    expect(sdk.signOut).toHaveBeenCalledWith(auth)
    expect(sdk.signInAnonymously).not.toHaveBeenCalled()
  })
})
