import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthChoiceScreen } from '../components/account/AuthChoiceScreen'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { firebaseInitialization } from '../lib/firebase'
import { createFirebaseAuthService, type AuthIdentity } from '../services/firebaseAuthService'
import { FirebaseAuthContext, type FirebaseSession } from './firebaseAuthContextDefinition'

type AuthenticationState =
  | { status: 'initializing' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; identity: AuthIdentity }
  | { status: 'error'; message: string }

function createInitialAuthenticationState(): AuthenticationState {
  return firebaseInitialization.status === 'error'
    ? { status: 'error', message: firebaseInitialization.message }
    : { status: 'initializing' }
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [authentication, setAuthentication] = useState<AuthenticationState>(
    createInitialAuthenticationState,
  )
  const authService = useMemo(
    () => firebaseInitialization.status === 'ready'
      ? createFirebaseAuthService(firebaseInitialization.services.auth)
      : null,
    [],
  )

  useEffect(() => {
    if (!authService) return

    let cancelled = false
    let unsubscribe: () => void = () => undefined
    void authService.observe({
      next(identity) {
        if (!cancelled) {
          setAuthentication(identity
            ? { status: 'authenticated', identity }
            : { status: 'unauthenticated' })
        }
      },
      error() {
        if (!cancelled) {
          setAuthentication({
            status: 'error',
            message: 'EdenOS could not observe the Firebase authentication state. Try again.',
          })
        }
      },
    }).then((stop) => {
      if (cancelled) stop()
      else unsubscribe = stop
    }).catch(() => {
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
  }, [authService])

  if (authentication.status === 'initializing') {
    return (
      <AppStatusScreen
        status="loading"
        title="Opening your private workspace"
        message="Checking for your existing EdenOS session…"
      />
    )
  }

  if (authentication.status === 'error' || !authService || firebaseInitialization.status === 'error') {
    return (
      <AppStatusScreen
        status="error"
        title="Firebase setup required"
        message={authentication.status === 'error' ? authentication.message : 'Firebase could not initialize.'}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (authentication.status === 'unauthenticated') {
    return (
      <AuthChoiceScreen
        onContinueAnonymous={async () => {
          const identity = await authService.continueAnonymously()
          setAuthentication({ status: 'authenticated', identity })
        }}
        onSignInGoogle={async () => {
          const identity = await authService.signInWithGoogle()
          if (identity) setAuthentication({ status: 'authenticated', identity })
        }}
      />
    )
  }

  const { identity } = authentication
  const session: FirebaseSession = {
    uid: identity.uid,
    firestore: firebaseInitialization.services.firestore,
    isAnonymous: identity.isAnonymous,
    email: identity.email,
    async connectGoogle() {
      if (!identity.isAnonymous) throw new Error('This account is already connected.')
      const linked = await authService.linkGoogle(identity.uid)
      if (!linked) return 'cancelled'
      if (linked.uid !== identity.uid) throw new Error('The linked Google identity changed unexpectedly.')
      setAuthentication({ status: 'authenticated', identity: linked })
      return 'connected'
    },
    async signOutGoogle() {
      if (identity.isAnonymous) throw new Error('A guest account cannot be signed out.')
      await authService.signOutGoogle()
      setAuthentication({ status: 'unauthenticated' })
    },
  }

  return <FirebaseAuthContext.Provider value={session}>{children}</FirebaseAuthContext.Provider>
}
