import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthChoiceScreen } from '../components/account/AuthChoiceScreen'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { firebaseInitialization } from '../lib/firebase'
import { guestHasMeaningfulData } from '../repositories/guestAccountRepository'
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
  const firestore = firebaseInitialization.services.firestore
  const session: FirebaseSession = {
    uid: identity.uid,
    firestore,
    isAnonymous: identity.isAnonymous,
    email: identity.email,
    async connectGoogle() {
      if (!identity.isAnonymous) throw new Error('This account is already connected.')
      let linked: AuthIdentity | null
      try {
        linked = await authService.linkGoogle(identity.uid)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/credential-already-in-use') {
          if (!authService.hasConflictingGoogleCredential()) return 'existing-unavailable'
          try {
            return await guestHasMeaningfulData(firestore, identity.uid)
              ? 'existing-with-data' : 'existing-empty'
          } catch {
            return 'existing-unavailable'
          }
        }
        throw error
      }
      if (!linked) return 'cancelled'
      if (linked.uid !== identity.uid) throw new Error('The linked Google identity changed unexpectedly.')
      setAuthentication({ status: 'authenticated', identity: linked })
      return 'connected'
    },
    async continueWithExistingGoogle() {
      if (!identity.isAnonymous) throw new Error('The guest session changed.')
      // Recheck just before switching in case a record was saved while the dialog was open.
      if (await guestHasMeaningfulData(firestore, identity.uid)) {
        throw new Error('This Guest now has data. Its records will stay protected.')
      }
      const existing = await authService.continueWithExistingGoogle(identity.uid)
      setAuthentication({ status: 'authenticated', identity: existing })
    },
    discardExistingGoogleChoice() {
      authService.discardConflictingGoogleCredential()
    },
    async signOutGoogle() {
      if (identity.isAnonymous) throw new Error('A guest account cannot be signed out.')
      await authService.signOutGoogle()
      setAuthentication({ status: 'unauthenticated' })
    },
  }

  return <FirebaseAuthContext.Provider value={session}>{children}</FirebaseAuthContext.Provider>
}
