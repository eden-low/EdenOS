import { LockKeyhole, ShieldEllipsis } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { usePrivacyLock } from '../../privacy/usePrivacyLock'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'

type Mode = 'enable' | 'change' | 'disable'

export function PrivacyLockSettings() {
  const privacy = usePrivacyLock()
  const [mode, setMode] = useState<Mode>('enable')
  const [open, setOpen] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  function begin(nextMode: Mode) { setMode(nextMode); setCurrentPin(''); setNextPin(''); setConfirmPin(''); setError(''); setOpen(true) }
  function pinValue(value: string) { return value.replace(/\D/g, '').slice(0, 6) }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (mode !== 'disable' && nextPin.length !== 6) { setError('Enter exactly 6 digits.'); return }
    if (mode !== 'disable' && nextPin !== confirmPin) { setError('PIN confirmation does not match.'); return }
    if (mode === 'enable') await privacy.setup(nextPin)
    else if (mode === 'change' && !(await privacy.changePin(currentPin, nextPin))) { setError('Current PIN is incorrect.'); return }
    else if (mode === 'disable' && !(await privacy.disable(currentPin))) { setError('Current PIN is incorrect.'); return }
    setOpen(false)
  }

  return <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5" aria-labelledby="privacy-lock-heading">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]"><ShieldEllipsis aria-hidden="true" size={19} /></span>
      <div className="min-w-0 flex-1"><h3 id="privacy-lock-heading" className="section-label">Privacy Lock</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{privacy.enabled ? privacy.locked ? 'Financial values are masked.' : 'Financial values are unlocked for this session.' : 'Hide financial values behind a 6-digit device PIN.'}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Casual viewing protection only. Your Firestore data is not encrypted.</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {!privacy.enabled ? <Button type="button" variant="secondary" onClick={() => begin('enable')}><LockKeyhole aria-hidden="true" size={16} />Enable</Button> : <>
        {!privacy.locked && <Button type="button" variant="secondary" onClick={privacy.lock}>Lock financial values</Button>}
        {!privacy.locked && <Button type="button" variant="ghost" onClick={() => begin('change')}>Change PIN</Button>}
        {!privacy.locked && <Button type="button" variant="ghost" onClick={() => begin('disable')}>Disable</Button>}
        {privacy.locked && <Button type="button" variant="secondary" onClick={privacy.requestUnlock}>Unlock</Button>}
      </>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby="privacy-setup-description">
        <DialogTitle>{mode === 'enable' ? 'Enable Privacy Lock' : mode === 'change' ? 'Change Privacy PIN' : 'Disable Privacy Lock'}</DialogTitle>
        <DialogDescription id="privacy-setup-description" className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">The PIN stays on this device. It protects against casual viewing and does not encrypt cloud records.</DialogDescription>
        <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
          {mode !== 'enable' && <label className="block"><span className="form-label">Current PIN</span><input aria-label="Current PIN" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={currentPin} onChange={(event) => setCurrentPin(pinValue(event.target.value))} /></label>}
          {mode !== 'disable' && <><label className="block"><span className="form-label">New 6-digit PIN</span><input aria-label="New 6-digit PIN" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={nextPin} onChange={(event) => setNextPin(pinValue(event.target.value))} /></label><label className="block"><span className="form-label">Confirm PIN</span><input aria-label="Confirm PIN" className="form-control" inputMode="numeric" autoComplete="off" maxLength={6} value={confirmPin} onChange={(event) => setConfirmPin(pinValue(event.target.value))} /></label></>}
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" className="w-full">{mode === 'disable' ? 'Disable Privacy Lock' : mode === 'change' ? 'Save new PIN' : 'Enable Privacy Lock'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </section>
}
