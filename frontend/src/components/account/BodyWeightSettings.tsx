import { useState, type FormEvent } from 'react'
import { parseBodyWeightKg } from '../../domain/userSettings'
import { useUserSettings } from '../../state/useUserSettings'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function BodyWeightSettings() {
  const { settings, status, saveBodyWeight } = useUserSettings()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function begin() {
    setInput(settings.bodyWeightKg === null ? '' : String(settings.bodyWeightKg))
    setError(null)
    setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const weight = parseBodyWeightKg(input)
    if (weight === null) {
      setError('Enter a body weight from 20 to 500 kg, to one decimal place.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveBodyWeight(weight)
      setEditing(false)
    } catch {
      setError('Could not save body weight. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Body weight" className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:p-5">
      <p className="section-label">Body weight</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Used for Estimated Calories. Saved to this account.</p>
      {editing ? (
        <form onSubmit={(event) => void save(event)} className="mt-4">
          <label htmlFor="body-weight-kg" className="form-label">Body weight (kg)</label>
          <input id="body-weight-kg" className="form-control" type="text" inputMode="decimal" value={input}
            onChange={(event) => setInput(event.target.value)} aria-invalid={Boolean(error)} autoFocus />
          {error && <InlineError message={error} />}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setError(null) }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save weight'}</Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-[var(--text-primary)]">
            {status === 'loading' ? 'Loading…' : status === 'error' ? 'Unavailable' : settings.bodyWeightKg === null ? 'Not configured' : `${settings.bodyWeightKg} kg`}
          </p>
          {status === 'loaded' && <Button type="button" variant="secondary" onClick={begin}>
            {settings.bodyWeightKg === null ? 'Add body weight' : 'Edit body weight'}
          </Button>}
        </div>
      )}
    </section>
  )
}
