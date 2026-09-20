import { CircleCheck, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { googleAuthErrorMessage } from '../../lib/googleAuthError'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import type { GuestDataSummary } from '../../types/account'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'
import { triggerPressFeedback } from '../ui/pressFeedback'
import { BodyWeightSettings } from './BodyWeightSettings'
import { ThemeSettings } from './ThemeSettings'
import { PrivacyLockSettings } from './PrivacyLockSettings'

export function AccountDialog({ children }: { children: ReactNode }) {
  const { isAnonymous, email, connectGoogle, continueWithExistingGoogle, discardExistingGoogleChoice, signOutGoogle } = useFirebaseAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<'link' | 'switch' | 'sign-out' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<GuestDataSummary | 'unavailable' | null>(null)
  const isConflict = conflict !== null
  const summary = conflict !== 'unavailable' ? conflict : null
  const safeSwitch = summary !== null && !summary.hasBlockingData

  const blockingSummaryItems = summary ? [
    ...(summary.expensesCount > 0 ? [`${summary.expensesCount} ${summary.expensesCount === 1 ? 'Expense' : 'Expenses'}`] : []),
    ...(summary.exercisesCount > 0 ? [`${summary.exercisesCount} ${summary.exercisesCount === 1 ? 'Exercise' : 'Exercises'}`] : []),
    ...(summary.hasBodyWeight ? ['Body weight configured'] : []),
    ...(summary.hasBudget ? ['Budget configured'] : []),
    ...(summary.hasSavingsGoal ? ['Savings Goal configured'] : []),
    ...(summary.otherBlockingData.length > 0 ? ['Other saved account data'] : []),
  ] : []

  function closeAccount() {
    setOpen(false)
    setError(null)
    setConflict(null)
    discardExistingGoogleChoice()
  }

  async function handleConnect() {
    setPending('link')
    setError(null)
    setConflict(null)
    try {
      const result = await connectGoogle()
      if (result.status === 'connected') closeAccount()
      if (result.status === 'existing-account') setConflict(result.summary)
      if (result.status === 'existing-unavailable') setConflict('unavailable')
    } catch (cause) {
      setError(googleAuthErrorMessage(cause, 'link'))
    } finally {
      setPending(null)
    }
  }

  async function handleExistingGoogle() {
    setPending('switch')
    setError(null)
    try {
      const result = await continueWithExistingGoogle()
      if (result.status === 'connected') closeAccount()
      if (result.status === 'blocked') setConflict(result.summary)
    } catch (cause) {
      setError(googleAuthErrorMessage(cause, 'sign-in'))
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
      if (!nextOpen) { setError(null); setConflict(null); discardExistingGoogleChoice() }
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
        <ThemeSettings />
        <PrivacyLockSettings />

        {isConflict ? (
          <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-teal-wash)] p-4 text-sm leading-6">
            <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-[var(--accent-teal)]" />
            <div className="text-[var(--text-secondary)]">
              <p>This Google account already has an EdenOS account.</p>
              {blockingSummaryItems.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--text-primary)]">
                  {blockingSummaryItems.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              {summary && summary.animeProgressCount > 0 && (
                <p className="mt-2">
                  Anime progress on {summary.animeProgressCount} {summary.animeProgressCount === 1 ? 'title' : 'titles'} is reconcilable and does not block switching on its own.
                </p>
              )}
              {conflict === 'unavailable' ? (
                <strong className="mt-2 block font-semibold text-[var(--text-primary)]">
                  We could not verify a safe switch. Your Guest records are unchanged.
                </strong>
              ) : safeSwitch ? (
                <strong className="mt-2 block font-semibold text-[var(--text-primary)]">
                  This Guest has no financial, exercise, or settings records that need protection. You can continue with the existing Google account.
                  {summary.animeProgressCount > 0 && ' Local Anime progress will remain and reconcile with the existing account.'}
                </strong>
              ) : (
                <strong className="mt-2 block font-semibold text-[var(--text-primary)]">
                  Your Guest records are being kept safe. EdenOS will not discard them, and Account Merge is not available yet.
                </strong>
              )}
            </div>
          </div>
        ) : null}
        {error ? <InlineError message={error} /> : null}

        <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
          {isConflict ? null : (
            <Button {...triggerPressFeedback} type="button" variant="ghost" className="press-feedback" onClick={closeAccount} disabled={pending !== null}>
              Close
            </Button>
          )}
          {isAnonymous && !isConflict ? (
            <Button {...triggerPressFeedback} type="button" className="press-feedback" onClick={() => void handleConnect()} disabled={pending !== null}>
              {pending === 'link' ? 'Connecting…' : 'Connect Google account'}
            </Button>
          ) : !isAnonymous ? (
            <Button {...triggerPressFeedback} type="button" variant="secondary" className="press-feedback" onClick={() => void handleSignOut()} disabled={pending !== null}>
              {pending === 'sign-out' ? 'Signing out…' : 'Sign out'}
            </Button>
          ) : null}
          {safeSwitch && (
            <Button {...triggerPressFeedback} type="button" className="press-feedback" onClick={() => void handleExistingGoogle()} disabled={pending !== null}>
              {pending === 'switch' ? 'Signing in…' : 'Continue with existing Google account'}
            </Button>
          )}
          {isConflict && (
            <Button {...triggerPressFeedback} type="button" variant={safeSwitch ? 'secondary' : 'primary'} className="press-feedback" onClick={closeAccount} disabled={pending !== null}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
