import { CircleCheck, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { googleAuthErrorMessage } from '../../lib/googleAuthError'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import type { GuestDataSummary, GuestExitReview } from '../../types/account'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'
import { triggerPressFeedback } from '../ui/pressFeedback'
import { ThemeSettings } from './ThemeSettings'
import { PrivacyLockSettings } from './PrivacyLockSettings'
import { NetworkSpeedTest } from './NetworkSpeedTest'
import { GenesisBootSettings } from '../../boot/GenesisBootSettings'
import { GuestExitWarning } from './GuestExitWarning'

export function AccountDialog({ children }: { children: ReactNode }) {
  const { uid, isAnonymous, email, connectGoogle, continueWithExistingGoogle, discardExistingGoogleChoice, signOutGoogle, reviewGuestExit } = useFirebaseAuth()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<'link' | 'switch' | 'sign-out' | 'guest-review' | null>(null)
  const [guestExit, setGuestExit] = useState<GuestExitReview | null>(null)
  const [switchAcknowledged, setSwitchAcknowledged] = useState(false)
  const [uidCopyStatus, setUidCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<GuestDataSummary | 'unavailable' | null>(null)
  const isConflict = conflict !== null
  const summary = conflict !== 'unavailable' ? conflict : null
  const safeSwitch = summary !== null && !summary.hasBlockingData

  const blockingSummaryItems = summary ? [
    ...(summary.expensesCount > 0 ? [`${summary.expensesCount} ${summary.expensesCount === 1 ? 'Expense' : 'Expenses'}`] : []),
    ...(summary.incomesCount > 0 ? [`${summary.incomesCount} ${summary.incomesCount === 1 ? 'Income record' : 'Income records'}`] : []),
    ...(summary.exercisesCount > 0 ? [`${summary.exercisesCount} ${summary.exercisesCount === 1 ? 'Exercise' : 'Exercises'}`] : []),
    ...(summary.hasBodyWeight ? ['Body weight configured'] : []),
    ...(summary.hasHeight ? ['Height configured'] : []),
    ...(summary.hasBudget ? ['Budget configured'] : []),
    ...(summary.hasSavingsGoal ? ['Savings Goal configured'] : []),
    ...(summary.otherBlockingData.length > 0 ? ['Other saved account data'] : []),
  ] : []

  function closeAccount() {
    setOpen(false)
    setError(null)
    setConflict(null)
    setGuestExit(null)
    setSwitchAcknowledged(false)
    setUidCopyStatus('idle')
    discardExistingGoogleChoice()
  }

  async function handleCopyUid() {
    setUidCopyStatus('idle')
    try {
      await navigator.clipboard.writeText(uid)
      setUidCopyStatus('copied')
    } catch {
      setUidCopyStatus('failed')
    }
  }

  async function handleConnect() {
    setPending('link')
    setError(null)
    setConflict(null)
    setSwitchAcknowledged(false)
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
    if (!switchAcknowledged) return
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

  async function handleGuestReview() {
    setPending('guest-review')
    setError(null)
    try {
      setGuestExit(await reviewGuestExit())
    } catch {
      setError('Could not review this Guest session. Your account is unchanged. Try again.')
    } finally {
      setPending(null)
    }
  }

  async function handleGuestExit() {
    if (!guestExit || pending) return
    setPending('sign-out')
    setError(null)
    try {
      await guestExit.confirmExit()
      closeAccount()
    } catch {
      setError('Could not leave this Guest session. Review the current account and try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (pending) return
      setOpen(nextOpen)
      if (!nextOpen) {
        setError(null); setConflict(null); setGuestExit(null); setSwitchAcknowledged(false); setUidCopyStatus('idle')
        discardExistingGoogleChoice()
      }
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

        {guestExit ? <>
          <GuestExitWarning summary={guestExit.summary} pending={pending !== null}
            onStay={() => { setGuestExit(null); setError(null) }} onExit={() => void handleGuestExit()} />
          {error ? <InlineError message={error} /> : null}
        </> : <>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
            {isAnonymous ? <UserRound aria-hidden="true" size={19} /> : <CircleCheck aria-hidden="true" size={19} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-label">Current status</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {isAnonymous ? 'Guest' : 'Google connected'}
              </p>
              <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => void handleCopyUid()}>
                {uidCopyStatus === 'copied' ? 'Firebase UID copied' : uidCopyStatus === 'failed' ? 'Could not copy UID' : 'Copy Firebase UID'}
              </Button>
            </div>
            {!isAnonymous && email && (
              <p className="mt-1 break-all text-sm text-[var(--text-secondary)]">{email}</p>
            )}
            <span className="sr-only" aria-live="polite">
              {uidCopyStatus === 'copied' ? 'Firebase UID copied to clipboard.' : uidCopyStatus === 'failed' ? 'Firebase UID could not be copied.' : ''}
            </span>
          </div>
        </div>

        <ThemeSettings />
        <GenesisBootSettings onReplay={closeAccount} replayDisabled={pending !== null || isConflict || error !== null} />
        <PrivacyLockSettings />
        <NetworkSpeedTest />

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
                  Anime progress on {summary.animeProgressCount} {summary.animeProgressCount === 1 ? 'title' : 'titles'} belongs to this Guest UID and does not block switching on its own.
                </p>
              )}
              {conflict === 'unavailable' ? (
                <strong className="mt-2 block font-semibold text-[var(--text-primary)]">
                  We could not verify a safe switch. Your Guest records are unchanged.
                </strong>
              ) : safeSwitch ? (
                <strong className="mt-2 block font-semibold text-[var(--text-primary)]">
                  This Guest has no financial, exercise, or settings records that need protection. You can continue with the existing Google account.
                  {summary.animeProgressCount > 0 && ' Guest Anime progress will remain under the Guest UID and will not be imported. It may be inaccessible after switching unless that Guest identity can be restored.'}
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
        {safeSwitch && <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]">
          <input type="checkbox" className="mt-1 size-5 shrink-0" checked={switchAcknowledged} disabled={pending !== null}
            onChange={(event) => setSwitchAcknowledged(event.target.checked)} />
          <span>I understand switching may permanently remove access to this Guest identity and its records. Copying the UID does not provide recovery.</span>
        </label>}

        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
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
          {isAnonymous && <Button type="button" variant="secondary" onClick={() => void handleGuestReview()} disabled={pending !== null}>
            {pending === 'guest-review' ? 'Checking Guest data…' : 'Sign Out / Switch Account'}
          </Button>}
          {safeSwitch && (
            <Button {...triggerPressFeedback} type="button" className="press-feedback" onClick={() => void handleExistingGoogle()} disabled={pending !== null || !switchAcknowledged}>
              {pending === 'switch' ? 'Signing in…' : 'Continue with existing Google account'}
            </Button>
          )}
          {isConflict && (
            <Button {...triggerPressFeedback} type="button" variant={safeSwitch ? 'secondary' : 'primary'} className="press-feedback" onClick={closeAccount} disabled={pending !== null}>
              Done
            </Button>
          )}
        </div>
        </>}
      </DialogContent>
    </Dialog>
  )
}
