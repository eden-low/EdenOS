import { useState, type ReactNode } from 'react'
import { googleAuthErrorMessage } from '../../lib/googleAuthError'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'

export function AccountDialog({ children }: { children: ReactNode }) {
  const { isAnonymous, email, connectGoogle, signOutGoogle } = useFirebaseAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<'link' | 'sign-out' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setPending('link')
    setError(null)
    try {
      await connectGoogle()
    } catch (cause) {
      setError(googleAuthErrorMessage(cause, 'link'))
    } finally {
      setPending(null)
    }
  }

  async function handleSignOut() {
    setPending('sign-out')
    setError(null)
    try {
      await signOutGoogle()
      setOpen(false)
    } catch {
      setError('Could not sign out. Try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (pending) return
      setOpen(nextOpen)
      if (!nextOpen) setError(null)
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent closeDisabled={pending !== null} className="sm:w-[min(28rem,calc(100vw-2rem))]">
        <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
          Account
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {isAnonymous
            ? 'Connect Google to use this same EdenOS account on another device.'
            : 'Your EdenOS account is connected to Google.'}
        </DialogDescription>

        <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="section-label">Current status</p>
          <p className="mt-2 font-semibold text-[var(--text-primary)]">
            {isAnonymous ? 'Guest' : 'Google connected'}
          </p>
          {!isAnonymous && email && (
            <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{email}</p>
          )}
        </div>

        {error && <InlineError message={error} />}

        <div className="mt-6 flex justify-end">
          {isAnonymous ? (
            <Button type="button" onClick={() => void handleConnect()} disabled={pending !== null}>
              {pending === 'link' ? 'Connecting…' : 'Connect Google account'}
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => void handleSignOut()} disabled={pending !== null}>
              {pending === 'sign-out' ? 'Signing out…' : 'Sign out'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
