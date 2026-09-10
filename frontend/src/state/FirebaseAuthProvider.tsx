import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Auth,
  type UserCredential,
} from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { firebaseInitialization } from '../lib/firebase'
import { FirebaseAuthContext, type FirebaseSession } from './firebaseAuthContextDefinition'

type AuthenticationState =
  | { status: 'initializing' }
  | { status: 'authenticated'; session: FirebaseSession }
  | { status: 'error'; message: string }

function createInitialAuthenticationState(): AuthenticationState {
  return firebaseInitialization.status === 'error'
    ? { status: 'error', message: firebaseInitialization.message }
    : { status: 'initializing' }
}

let anonymousSignInPromise: Promise<UserCredential> | null = null

function ensureAnonymousUser(auth: Auth): Promise<UserCredential> {
  anonymousSignInPromise ??= signInAnonymously(auth).finally(() => {
    anonymousSignInPromise = null
  })
  return anonymousSignInPromise
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [authentication, setAuthentication] = useState<AuthenticationState>(
    createInitialAuthenticationState,
  )

  useEffect(() => {
    if (firebaseInitialization.status === 'error') return

    const { auth, firestore } = firebaseInitialization.services
    let cancelled = false
    let unsubscribe: () => void = () => undefined

    async function startAuthentication() {
      await setPersistence(auth, browserLocalPersistence)
      if (cancelled) return

      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          if (cancelled) return
          if (user) {
            setAuthentication({
              status: 'authenticated',
              session: { uid: user.uid, firestore },
            })
            return
          }

          void ensureAnonymousUser(auth).catch(() => {
            if (!cancelled) {
              setAuthentication({
                status: 'error',
                message: 'EdenOS could not start its private Firebase session. Check Anonymous Authentication and try again.',
              })
            }
          })
        },
        () => {
          if (!cancelled) {
            setAuthentication({
              status: 'error',
              message: 'EdenOS could not observe the Firebase authentication state. Try again.',
            })
          }
        },
      )
    }

    void startAuthentication().catch(() => {
      if (!cancelled) {
        setAuthentication({
          status: 'error',
          message: 'EdenOS could not enable browser-local Firebase authentication. Try again.',
        })
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (authentication.status === 'initializing') {
    return (
      <AppStatusScreen
        status="loading"
        title="Opening your private workspace"
        message="Starting a secure local Firebase session…"
      />
    )
  }

  if (authentication.status === 'error') {
    return (
      <AppStatusScreen
        status="error"
        title="Firebase setup required"
        message={authentication.message}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <FirebaseAuthContext.Provider value={authentication.session}>
      {children}
    </FirebaseAuthContext.Provider>
  )
}
