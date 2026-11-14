import { LockKeyhole, ShieldEllipsis } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import { Button } from '../ui/button'

type Mode = 'enable' | 'change' | 'disable' | 'unlock'

export function PrivacyLockSettings() {
  const privacy = usePrivacyLock()
  const [mode, setMode] = useState<Mode>('enable')
  const [open, setOpen] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const actionRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const wasOpen = useRef(false)

  useLayoutEffect(() => {
    if (wasOpen.current && !open) {
      const target = returnFocus.current?.isConnected ? returnFocus.current : actionRef.current?.querySelector('button')
      target?.focus()
    }
    wasOpen.current = open
  }, [open])

  function begin(nextMode: Mode, trigger: HTMLButtonElement) { returnFocus.current = trigger; setMode(nextMode); setCurrentPin(''); setNextPin(''); setConfirmPin(''); setError(''); setOpen(true) }
  function closeEditor() { setOpen(false); setCurrentPin(''); setNextPin(''); setConfirmPin(''); setError('') }
  function pinValue(value: string) { return value.replace(/\D/g, '').slice(0, 6) }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (mode === 'unlock') {
      if (Date.now() < privacy.retryAt) { setError('Please wait briefly before trying again.'); return }
      if (!(await privacy.unlock(currentPin))) { setError('That PIN is incorrect.'); return }
      closeEditor()
      return
    }
    if (mode !== 'disable' && nextPin.length !== 6) { setError('Enter exactly 6 digits.'); return }
    if (mode !== 'disable' && nextPin !== confirmPin) { setError('PIN confirmation does not match.'); return }
    if (mode === 'enable') await privacy.setup(nextPin)
    else if (mode === 'change' && !(await privacy.changePin(currentPin, nextPin))) { setError('Current PIN is incorrect.'); return }
    else if (mode === 'disable' && !(await privacy.disable(currentPin))) { setError('Current PIN is incorrect.'); return }
    closeEditor()
  }

  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="privacy-lock-heading">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]"><ShieldEllipsis aria-hidden="true" size={19} /></span>
      <div className="min-w-0 flex-1"><h3 id="privacy-lock-heading" className="section-label">Privacy Lock</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{privacy.enabled ? privacy.locked ? 'Financial values are masked.' : 'Financial values are unlocked for this session.' : 'Hide financial values behind a 6-digit device PIN.'}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Casual viewing protection only. Your Firestore data is not encrypted.</p></div>
    </div>
    <div ref={actionRef} hidden={open} className={open ? 'hidden' : 'mt-4 flex flex-wrap gap-2'}>
      {!privacy.enabled ? <Button type="button" variant="secondary" onClick={(event) => begin('enable', event.currentTarget)}><LockKeyhole aria-hidden="true" size={16} />Enable</Button> : <>
        {!privacy.locked && <Button type="button" variant="secondary" onClick={privacy.lock}>Lock financial values</Button>}
        {!privacy.locked && <Button type="button" variant="ghost" onClick={(event) => begin('change', event.currentTarget)}>Change PIN</Button>}
        {!privacy.locked && <Button type="button" variant="ghost" onClick={(event) => begin('disable', event.currentTarget)}>Disable</Button>}
        {privacy.locked && <Button type="button" variant="secondary" onClick={(event) => begin('unlock', event.currentTarget)}>Unlock</Button>}
      </>}
    </div>
    {open && <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
        <h4 className="font-semibold">{mode === 'enable' ? 'Enable Privacy Lock' : mode === 'change' ? 'Change Privacy PIN' : mode === 'unlock' ? 'Unlock financial values' : 'Disable Privacy Lock'}</h4>
        <p id="privacy-setup-description" className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">The PIN stays on this device. It protects against casual viewing and does not encrypt cloud records.</p>
        <form className="mt-5 space-y-4" aria-describedby="privacy-setup-description" onSubmit={(event) => void submit(event)}>
          {mode !== 'enable' && <label className="block"><span className="form-label">Current PIN</span><input autoFocus aria-label="Current PIN" type="password" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(pinValue(event.target.value))} /></label>}
          {(mode === 'enable' || mode === 'change') && <><label className="block"><span className="form-label">New 6-digit PIN</span><input autoFocus={mode === 'enable'} aria-label="New 6-digit PIN" type="password" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={nextPin} onChange={(event) => setNextPin(pinValue(event.target.value))} /></label><label className="block"><span className="form-label">Confirm PIN</span><input aria-label="Confirm PIN" type="password" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={confirmPin} onChange={(event) => setConfirmPin(pinValue(event.target.value))} /></label></>}
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={mode === 'unlock' && currentPin.length !== 6}>{mode === 'unlock' ? 'Unlock' : mode === 'disable' ? 'Disable Privacy Lock' : mode === 'change' ? 'Save new PIN' : 'Enable Privacy Lock'}</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={closeEditor}>Cancel PIN changes</Button>
        </form>
      </div>}
  </section>
}
