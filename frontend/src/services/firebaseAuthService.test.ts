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
}))

vi.mock('firebase/auth', () => ({
  browserLocalPersistence: { type: 'LOCAL' },
  GoogleAuthProvider: class GoogleAuthProvider {},
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
