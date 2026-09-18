import { CircleCheck, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { googleAuthErrorMessage } from '../../lib/googleAuthError'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'
import { triggerPressFeedback } from '../ui/pressFeedback'
import { BodyWeightSettings } from './BodyWeightSettings'

const accountConflictMessage =
  'This Google account is already connected to another EdenOS account. Your guest records are unchanged.'

export function AccountDialog({ children }: { children: ReactNode }) {
  const { isAnonymous, email, connectGoogle, signOutGoogle } = useFirebaseAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<'link' | 'sign-out' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isConflict = error === accountConflictMessage

  function closeAccount() {
    setOpen(false)
    setError(null)
  }

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
      <DialogContent variant="account" closeDisabled={pending !== null} className="sm:w-[min(30rem,calc(100vw-2rem))]">
        <div className="pr-11">
          <p className="section-label text-[var(--accent-soft)]">Eden OS</p>
          <DialogTitle className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
            Account
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {isAnonymous
              ? 'Connect Google to use this same EdenOS account on another device.'
              : 'Your EdenOS account is connected to Google.'}
          </DialogDescription>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
            {isAnonymous ? <UserRound aria-hidden="true" size={19} /> : <CircleCheck aria-hidden="true" size={19} />}
          </span>
          <div className="min-w-0">
            <p className="section-label">Current status</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
              {isAnonymous ? 'Guest' : 'Google connected'}
            </p>
            {!isAnonymous && email && (
              <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{email}</p>
            )}
          </div>
        </div>

        <BodyWeightSettings />

        {isConflict ? (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-teal-wash)] p-4 text-sm leading-6">
            <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[var(--accent-teal)]" />
            <p className="text-[var(--text-secondary)]">
              This Google account is already connected to another EdenOS account.{' '}
              <strong className="mt-2 block font-semibold text-[var(--text-primary)]">Your guest records are unchanged.</strong>
            </p>
          </div>
        ) : error ? <InlineError message={error} /> : null}

        <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
          {isConflict ? null : (
            <Button {...triggerPressFeedback} type="button" variant="ghost" className="press-feedback" onClick={closeAccount} disabled={pending !== null}>
              Close
            </Button>
          )}
          {isAnonymous ? (
            <Button {...triggerPressFeedback} type="button" variant={isConflict ? 'secondary' : 'primary'} className="press-feedback" onClick={() => void handleConnect()} disabled={pending !== null}>
              {pending === 'link' ? 'Connecting…' : 'Connect Google account'}
            </Button>
          ) : (
            <Button {...triggerPressFeedback} type="button" variant="secondary" className="press-feedback" onClick={() => void handleSignOut()} disabled={pending !== null}>
              {pending === 'sign-out' ? 'Signing out…' : 'Sign out'}
            </Button>
          )}
          {isConflict && (
            <Button {...triggerPressFeedback} type="button" className="press-feedback" onClick={closeAccount} disabled={pending !== null}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
