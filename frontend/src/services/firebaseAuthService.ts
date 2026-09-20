import {
  browserLocalPersistence,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signInWithCredential,
  signOut,
  type Auth,
  type AuthError,
  type OAuthCredential,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { classifyGoogleAuthError } from '../lib/googleAuthError'

export interface AuthIdentity {
  uid: string
  isAnonymous: boolean
  email: string | null
}

export interface AuthObserver {
  next: (identity: AuthIdentity | null) => void
  error: (error: unknown) => void
}

export interface FirebaseAuthService {
  observe: (observer: AuthObserver) => Promise<() => void>
  continueAnonymously: () => Promise<AuthIdentity>
  signInWithGoogle: () => Promise<AuthIdentity | null>
  linkGoogle: (expectedUid: string) => Promise<AuthIdentity | null>
  hasConflictingGoogleCredential: () => boolean
  discardConflictingGoogleCredential: () => void
  continueWithExistingGoogle: (expectedGuestUid: string) => Promise<AuthIdentity>
  signOutGoogle: () => Promise<void>
}

function toIdentity(user: User): AuthIdentity {
  return { uid: user.uid, isAnonymous: user.isAnonymous, email: user.email }
}

async function withGooglePopup(action: () => Promise<UserCredential>): Promise<AuthIdentity | null> {
  try {
    return toIdentity((await action()).user)
  } catch (error) {
    if (classifyGoogleAuthError(error) === 'cancelled') return null
    throw error
  }
}

export function createFirebaseAuthService(auth: Auth): FirebaseAuthService {
  let conflictingCredential: OAuthCredential | null = null
  return {
    hasConflictingGoogleCredential: () => conflictingCredential !== null,
    discardConflictingGoogleCredential: () => { conflictingCredential = null },
    async observe(observer) {
      await setPersistence(auth, browserLocalPersistence)
      return onAuthStateChanged(
        auth,
        (user) => observer.next(user ? toIdentity(user) : null),
        observer.error,
      )
    },

    async continueAnonymously() {
      if (auth.currentUser) return toIdentity(auth.currentUser)
      return toIdentity((await signInAnonymously(auth)).user)
    },

    async signInWithGoogle() {
      if (auth.currentUser) throw new Error('Google sign-in requires an unauthenticated session.')
      return withGooglePopup(() => signInWithPopup(auth, new GoogleAuthProvider()))
    },

    async linkGoogle(expectedUid) {
      conflictingCredential = null
      const user = auth.currentUser
      if (!user || !user.isAnonymous || user.uid !== expectedUid) {
        throw new Error('The current guest session could not be verified.')
      }
      let identity: AuthIdentity | null
      try {
        identity = await withGooglePopup(() => linkWithPopup(user, new GoogleAuthProvider()))
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error &&
            error.code === 'auth/credential-already-in-use') {
          conflictingCredential = GoogleAuthProvider.credentialFromError(error as AuthError)
        }
        throw error
      }
      if (identity && (identity.uid !== expectedUid || identity.isAnonymous)) {
        throw new Error('The linked Google identity could not be verified.')
      }
      return identity
    },

    async continueWithExistingGoogle(expectedGuestUid) {
      const user = auth.currentUser
      if (!user || !user.isAnonymous || user.uid !== expectedGuestUid || !conflictingCredential) {
        throw new Error('The guest session or Google credential is no longer available. Connect Google again.')
      }
      const credential = conflictingCredential
      conflictingCredential = null
      const identity = toIdentity((await signInWithCredential(auth, credential)).user)
      if (identity.isAnonymous || identity.uid === expectedGuestUid) {
        throw new Error('The existing Google account could not be verified.')
      }
      return identity
    },

    async signOutGoogle() {
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        throw new Error('A guest account cannot be signed out without a recovery identity.')
      }
      await signOut(auth)
    },
  }
}
