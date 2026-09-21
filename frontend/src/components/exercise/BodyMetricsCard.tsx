import { Ruler, Scale } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { calculateBmi, getBmiCategory } from '../../domain/bmi'
import { parseBodyWeightKg, parseHeightCm } from '../../domain/userSettings'
import { useUserSettings } from '../../state/useUserSettings'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function BodyMetricsCard() {
  const { settings, status, saveBodyWeight, saveHeight } = useUserSettings()
  const [editing, setEditing] = useState(false)
  const [heightInput, setHeightInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bmi = calculateBmi(settings.bodyWeightKg, settings.heightCm)

  function begin() {
    setHeightInput(settings.heightCm === null ? '' : String(settings.heightCm))
    setWeightInput(settings.bodyWeightKg === null ? '' : String(settings.bodyWeightKg))
    setError(null)
    setEditing(true)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const height = parseHeightCm(heightInput)
    const weight = parseBodyWeightKg(weightInput)
    if (height === null) { setError('Enter a height from 80 to 250 cm as a whole number.'); return }
    if (weight === null) { setError('Enter a body weight from 20 to 500 kg, to one decimal place.'); return }
    setSaving(true); setError(null)
    try {
      if (height !== settings.heightCm) await saveHeight(height)
      if (weight !== settings.bodyWeightKg) await saveBodyWeight(weight)
      setEditing(false)
    } catch { setError('Could not save body metrics. Try again.') } finally { setSaving(false) }
  }

  return <section aria-labelledby="body-metrics-heading" className="dashboard-card p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><p className="section-label text-[var(--accent-soft)]">Profile</p><h2 id="body-metrics-heading" className="mt-1 text-lg font-semibold">Body Metrics</h2></div>{status === 'loaded' && !editing && <Button type="button" variant="secondary" onClick={begin}>Edit</Button>}</div>
    {editing ? <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className="form-label" htmlFor="body-height-cm">Height (cm)</label><input id="body-height-cm" className="form-control" inputMode="numeric" value={heightInput} onChange={(event) => setHeightInput(event.target.value)} autoFocus /></div>
      <div><label className="form-label" htmlFor="exercise-body-weight-kg">Weight (kg)</label><input id="exercise-body-weight-kg" className="form-control" inputMode="decimal" value={weightInput} onChange={(event) => setWeightInput(event.target.value)} /></div>
      {error && <div className="sm:col-span-2"><InlineError message={error} /></div>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save metrics'}</Button></div>
    </form> : <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric icon={<Ruler size={17} />} label="Height" value={settings.heightCm === null ? 'Not set' : `${settings.heightCm} cm`} />
        <Metric icon={<Scale size={17} />} label="Weight" value={settings.bodyWeightKg === null ? 'Not set' : `${settings.bodyWeightKg.toFixed(1)} kg`} />
        <div className="col-span-2 rounded-2xl bg-[var(--accent-teal-wash)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-teal)]">BMI</p>{bmi === null ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Add height and weight to calculate BMI.</p> : <div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-[-0.04em]">{bmi.toFixed(1)}</p><p className="text-right text-sm"><span className="block text-xs text-[var(--text-muted)]">Category</span><strong>{getBmiCategory(bmi)}</strong></p></div>}</div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">BMI is a general screening measure, not a medical diagnosis.</p>
    </>}
  </section>
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"><span className="text-[var(--accent-soft)]">{icon}</span><p className="mt-3 text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-semibold">{value}</p></div>
}
