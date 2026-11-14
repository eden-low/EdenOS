import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BootAuthContext } from '../boot/bootAuthContext'
import { BootAuthSessions } from '../boot/bootAuthSession'
import { AuthChoiceScreen } from '../components/account/AuthChoiceScreen'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { firebaseInitialization } from '../lib/firebase'
import { classifyGoogleAuthError } from '../lib/googleAuthError'
import { getGuestDataSummary } from '../repositories/guestAccountRepository'
import { readLocalAnimeProgress } from '../services/animeProgressLocalStorage'
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
  const [authentication, setAuthenticationState] = useState<AuthenticationState>(
    createInitialAuthenticationState,
  )
  const [bootSessions] = useState(() => new BootAuthSessions())
  const setAuthentication = useCallback((next: AuthenticationState) => {
    bootSessions.observe(next.status, next.status === 'authenticated' ? next.identity.uid : undefined)
    setAuthenticationState(next)
  }, [bootSessions])
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
  }, [authService, setAuthentication])

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
          await bootSessions.trackAction(async () => {
            const identity = await authService.continueAnonymously()
            setAuthentication({ status: 'authenticated', identity })
          })
        }}
        onSignInGoogle={async () => {
          await bootSessions.trackAction(async () => {
            const identity = await authService.signInWithGoogle()
            if (identity) setAuthentication({ status: 'authenticated', identity })
            return identity
          }, (identity) => identity !== null)
        }}
      />
    )
  }

  const { identity } = authentication
  const firestore = firebaseInitialization.services.firestore

  async function summarizeGuest(): Promise<GuestDataSummary> {
    const localAnimeProgressCount = readLocalAnimeProgress(localStorage, identity.uid).length
    return getGuestDataSummary(firestore, identity.uid, localAnimeProgressCount)
  }

  const session: FirebaseSession = {
    uid: identity.uid,
    firestore,
    isAnonymous: identity.isAnonymous,
    email: identity.email,
    async reviewGuestExit() {
      if (!identity.isAnonymous) throw new Error('Only a Guest session can be reviewed for Guest exit.')
      let summary: GuestDataSummary | 'unavailable' = 'unavailable'
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        summary = await Promise.race([
          summarizeGuest(),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Guest review timed out.')), 8000) }),
        ])
      } catch {
        // Unknown is never treated as empty. The explicit exit warning is still
        // available; this does not authorize the protected Google conflict path.
      } finally {
        clearTimeout(timer)
      }
      let started = false
      return {
        summary,
        async confirmExit() {
          if (started) throw new Error('This Guest exit is already in progress or complete.')
          started = true
          try {
            await bootSessions.trackAction(async () => {
              await authService.signOutGuest(identity.uid)
              setAuthentication({ status: 'unauthenticated' })
            }, () => false)
          } catch (error) {
            started = false
            throw error
          }
        },
      }
    },
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
              incomesCount: summary.incomesCount,
              exercisesCount: summary.exercisesCount,
              hasBodyWeight: summary.hasBodyWeight,
              hasHeight: summary.hasHeight,
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

  // Decorate UI outcomes only; the original auth operations and results are unchanged.
  const bootAwareSession: FirebaseSession = {
    ...session,
    connectGoogle: () => bootSessions.trackAction(() => session.connectGoogle(), (result) => result.status === 'connected'),
    continueWithExistingGoogle: () => bootSessions.trackAction(() => session.continueWithExistingGoogle(), (result) => result.status === 'connected'),
    signOutGoogle: () => bootSessions.trackAction(() => session.signOutGoogle(), () => false),
  }
  return <BootAuthContext.Provider value={{ sessions: bootSessions, uid: identity.uid }}>
    <FirebaseAuthContext.Provider key={identity.uid} value={bootAwareSession}>{children}</FirebaseAuthContext.Provider>
  </BootAuthContext.Provider>
}
