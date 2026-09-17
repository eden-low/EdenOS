import { useState } from 'react'
import { googleAuthErrorMessage } from '../../lib/googleAuthError'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function AuthChoiceScreen({
  onContinueAnonymous,
  onSignInGoogle,
}: {
  onContinueAnonymous: () => Promise<void>
  onSignInGoogle: () => Promise<void>
}) {
  const [pending, setPending] = useState<'guest' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function continueAsGuest() {
    setPending('guest')
    setError(null)
    try {
      await onContinueAnonymous()
    } catch {
      setError('Could not start a guest session. Try again.')
    } finally {
      setPending(null)
    }
  }

  async function signInGoogle() {
    setPending('google')
    setError(null)
    try {
      await onSignInGoogle()
    } catch (cause) {
      setError(googleAuthErrorMessage(cause, 'sign-in'))
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-10 text-[var(--text-primary)]">
      <section className="dashboard-card w-full max-w-md p-7 sm:p-9">
        <p className="section-label">Eden OS</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">Open your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          Sign in with a connected Google account, or continue as a guest on this device.
        </p>
        {error && <InlineError message={error} />}
        <div className="mt-7 flex flex-col gap-3">
          <Button type="button" onClick={() => void signInGoogle()} disabled={pending !== null}>
            {pending === 'google' ? 'Signing in…' : 'Sign in with Google'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void continueAsGuest()} disabled={pending !== null}>
            {pending === 'guest' ? 'Opening…' : 'Continue as guest'}
          </Button>
        </div>
      </section>
    </main>
  )
}
