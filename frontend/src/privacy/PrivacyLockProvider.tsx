import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog'
import { createPrivacyLockRecord, privacyAutoLockMs, privacyLockStorageKey, privacyRetryDelayMs, readPrivacyLockRecord, verifyPrivacyPin } from './privacyLock'
import { PrivacyLockContext, type PrivacyLockContextValue } from './privacyLockContext'

export function PrivacyLockProvider({ children }: { children: ReactNode }) {
  const [record, setRecord] = useState(() => readPrivacyLockRecord(localStorage))
  const [locked, setLocked] = useState(() => readPrivacyLockRecord(localStorage) !== null)
  const failures = useRef(0)
  const [retryAt, setRetryAt] = useState(0)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const hiddenAt = useRef<number | null>(null)

  const unlock = useCallback(async (candidate: string) => {
    if (!record || Date.now() < retryAt) return false
    const valid = await verifyPrivacyPin(candidate, record)
    if (valid) { setLocked(false); failures.current = 0; setRetryAt(0); return true }
    failures.current += 1
    const delay = privacyRetryDelayMs(failures.current)
    if (delay) setRetryAt(Date.now() + delay)
    return false
  }, [record, retryAt])

  useEffect(() => {
    function visibility() {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current !== null) {
        if (Date.now() - hiddenAt.current >= privacyAutoLockMs && record) setLocked(true)
        hiddenAt.current = null
      }
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [record])

  const value = useMemo<PrivacyLockContextValue>(() => ({
    enabled: record !== null,
    locked: record !== null && locked,
    retryAt,
    async setup(nextPin) {
      const next = await createPrivacyLockRecord(nextPin)
      localStorage.setItem(privacyLockStorageKey, JSON.stringify(next))
      setRecord(next); setLocked(false); failures.current = 0; setRetryAt(0)
    },
    unlock,
    lock() { if (record) setLocked(true) },
    async changePin(currentPin, nextPin) {
      if (!record || !(await verifyPrivacyPin(currentPin, record))) return false
      const next = await createPrivacyLockRecord(nextPin)
      localStorage.setItem(privacyLockStorageKey, JSON.stringify(next))
      setRecord(next); setLocked(false); failures.current = 0; setRetryAt(0)
      return true
    },
    async disable(currentPin) {
      if (!record || !(await verifyPrivacyPin(currentPin, record))) return false
      localStorage.removeItem(privacyLockStorageKey)
      setRecord(null); setLocked(false); failures.current = 0; setRetryAt(0)
      return true
    },
    requestUnlock() { if (record && locked) { setPin(''); setUnlockError(''); setUnlockOpen(true) } },
  }), [locked, record, retryAt, unlock])

  async function submitUnlock(event: FormEvent) {
    event.preventDefault()
    if (Date.now() < retryAt) { setUnlockError('Please wait briefly before trying again.'); return }
    if (await unlock(pin)) { setUnlockOpen(false); setPin(''); setUnlockError('') }
    else setUnlockError('That PIN is incorrect.')
  }

  return <PrivacyLockContext.Provider value={value}>
    {children}
    <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
      <DialogContent aria-describedby="privacy-unlock-description">
        <DialogTitle>Unlock financial values</DialogTitle>
        <DialogDescription id="privacy-unlock-description" className="mt-2 text-sm text-[var(--text-secondary)]">Enter your 6-digit device PIN.</DialogDescription>
        <form className="mt-5" onSubmit={(event) => void submitUnlock(event)}>
          <label className="form-label" htmlFor="privacy-unlock-pin">PIN</label>
          <input id="privacy-unlock-pin" className="form-control" type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
          {unlockError && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{unlockError}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={pin.length !== 6}>Unlock</Button>
        </form>
      </DialogContent>
    </Dialog>
  </PrivacyLockContext.Provider>
}
