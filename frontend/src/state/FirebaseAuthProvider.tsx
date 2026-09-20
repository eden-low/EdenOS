import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthChoiceScreen } from '../components/account/AuthChoiceScreen'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { firebaseInitialization } from '../lib/firebase'
import { classifyGoogleAuthError } from '../lib/googleAuthError'
import { createFirestoreAnimeProgressRepository } from '../repositories/firestoreAnimeProgressRepository'
import { getGuestDataSummary } from '../repositories/guestAccountRepository'
import { readLocalAnimeProgress, writeLocalAnimeProgress } from '../services/animeProgressLocalStorage'
import { reconcileAnimeProgress } from '../services/animeProgressReconciliation'
import { createFirebaseAuthService, type AuthIdentity } from '../services/firebaseAuthService'
import type { GuestDataSummary } from '../types/account'
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

function maskedUid(uid: string): string {
  return uid.length > 8 ? `${uid.slice(0, 4)}…${uid.slice(-4)}` : 'masked'
}

function authErrorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code : 'unknown'
}

function accountDiagnostic(event: string, details: Record<string, unknown>): void {
  if (import.meta.env.DEV) console.info('[account-auth]', { event, ...details })
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

  async function summarizeGuest(): Promise<GuestDataSummary> {
    const localAnimeProgressCount = readLocalAnimeProgress(localStorage).length
    return getGuestDataSummary(firestore, identity.uid, localAnimeProgressCount)
  }

  async function preserveGuestCloudAnimeProgress(summary: GuestDataSummary): Promise<void> {
    if (summary.animeCloudProgressCount === 0) return
    const repository = createFirestoreAnimeProgressRepository(firestore, identity.uid)
    const cloudItems = await repository.readAllFromServer()
    const localItems = readLocalAnimeProgress(localStorage)
    writeLocalAnimeProgress(localStorage, reconcileAnimeProgress(localItems, cloudItems))
  }

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
        if (classifyGoogleAuthError(error) === 'account-conflict') {
          accountDiagnostic('google-link-conflict', {
            uid: maskedUid(identity.uid),
            code: authErrorCode(error),
          })
          if (!authService.hasPendingGoogleConflict()) return { status: 'existing-unavailable' }
          try {
            const summary = await summarizeGuest()
            accountDiagnostic(summary.hasBlockingData ? 'guest-blocked' : 'guest-safe', {
              uid: maskedUid(identity.uid),
              expensesCount: summary.expensesCount,
              exercisesCount: summary.exercisesCount,
              hasBodyWeight: summary.hasBodyWeight,
              hasBudget: summary.hasBudget,
              hasSavingsGoal: summary.hasSavingsGoal,
              animeProgressCount: summary.animeProgressCount,
              otherBlockingData: summary.otherBlockingData,
            })
            return { status: 'existing-account', summary }
          } catch (summaryError) {
            accountDiagnostic('guest-summary-failure', {
              uid: maskedUid(identity.uid),
              code: authErrorCode(summaryError),
            })
            return { status: 'existing-unavailable' }
          }
        }
        throw error
      }
      if (!linked) return { status: 'cancelled' }
      if (linked.uid !== identity.uid) throw new Error('The linked Google identity changed unexpectedly.')
      setAuthentication({ status: 'authenticated', identity: linked })
      return { status: 'connected' }
    },
    async continueWithExistingGoogle() {
      if (!identity.isAnonymous) throw new Error('The guest session changed.')
      // Recheck just before switching in case a record was saved while the dialog was open.
      const summary = await summarizeGuest()
      if (summary.hasBlockingData) {
        accountDiagnostic('guest-blocked', { uid: maskedUid(identity.uid), recheck: true })
        return { status: 'blocked', summary }
      }
      await preserveGuestCloudAnimeProgress(summary)
      try {
        const existing = await authService.continueWithExistingGoogle(identity.uid)
        if (!existing) return { status: 'cancelled' }
        setAuthentication({ status: 'authenticated', identity: existing })
        accountDiagnostic('existing-account-signin-success', {
          fromUid: maskedUid(identity.uid),
          toUid: maskedUid(existing.uid),
        })
        return { status: 'connected' }
      } catch (error) {
        accountDiagnostic('existing-account-signin-failure', {
          uid: maskedUid(identity.uid),
          code: authErrorCode(error),
        })
        throw error
      }
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

  return <FirebaseAuthContext.Provider key={identity.uid} value={session}>{children}</FirebaseAuthContext.Provider>
}
