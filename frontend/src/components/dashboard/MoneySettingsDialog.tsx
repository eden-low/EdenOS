import { useState, type FormEvent } from 'react'
import { parseRinggitToSen } from '../../lib/format'
import { useUserSettings } from '../../state/useUserSettings'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'

function amountInput(amountSen: number | null) {
  if (amountSen === null) return ''
  return `${Math.floor(amountSen / 100)}.${String(amountSen % 100).padStart(2, '0')}`
}

export function MoneySettingsDialog({ kind }: { kind: 'budget' | 'savings' }) {
  const { settings, status, saveMonthlyBudget, saveSavingsGoal } = useUserSettings()
  const isBudget = kind === 'budget'
  const label = isBudget ? 'Budget' : 'Savings Goal'
  const amountSen = isBudget ? settings.monthlyBudgetSen : settings.savingsGoalSen
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen(nextOpen: boolean) {
    if (saving) return
    setOpen(nextOpen)
    if (nextOpen) setInput(amountInput(amountSen))
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const parsed = parseRinggitToSen(input)
    if (parsed === null) {
      setError('Enter an amount above RM 0 with no more than two decimal places.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isBudget) await saveMonthlyBudget(parsed)
      else await saveSavingsGoal(parsed)
      setOpen(false)
    } catch {
      setError(`Could not save ${label.toLowerCase()}. Try again.`)
    } finally {
      setSaving(false)
    }
  }

  return <Dialog open={open} onOpenChange={handleOpen}>
    <DialogTrigger asChild>
      <Button type="button" variant="secondary" disabled={status !== 'loaded'}>
        {amountSen === null ? `Configure ${label}` : `Edit ${label}`}
      </Button>
    </DialogTrigger>
    <DialogContent closeDisabled={saving} className="sm:w-[min(30rem,calc(100vw-2rem))]">
      <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
        {amountSen === null ? `Configure ${label}` : `Edit ${label}`}
      </DialogTitle>
      <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {isBudget ? 'Set one monthly spending limit for this account.' : 'Set one target amount to save. No deadline or progress tracking is attached.'}
      </DialogDescription>
      <form onSubmit={(event) => void save(event)} className="mt-6" noValidate>
        <label htmlFor={`${kind}-amount`} className="form-label">{label} amount (RM)</label>
        <input id={`${kind}-amount`} className="form-control" type="text" inputMode="decimal" autoFocus
          value={input} onChange={(event) => setInput(event.target.value)} aria-invalid={Boolean(error)} />
        {error && <InlineError message={error} />}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={saving} onClick={() => handleOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : `Save ${label}`}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
