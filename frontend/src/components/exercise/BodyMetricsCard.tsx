import { Ruler, Scale } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { calculateBmi, getBmiCategory } from '../../domain/bmi'
import { parseBodyWeightKg, parseHeightCm, type BodyMeasurement } from '../../domain/userSettings'
import { useUserSettings } from '../../state/useUserSettings'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function changeLabel(rows: BodyMeasurement[], unit: string) {
  if (rows.length < 2) return null
  const difference = Math.round((rows[0].value - rows[1].value) * 10) / 10
  return difference === 0 ? 'No Change' : `${difference > 0 ? 'Up' : 'Down'} ${Math.abs(difference)} ${unit}`
}

export function BodyMetricsCard() {
  const { settings, measurements = [], status, saveBodyWeight, saveHeight } = useUserSettings()
  const [editing, setEditing] = useState<'weight' | 'height' | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const measurementId = useRef<string | null>(null)
  const bmi = calculateBmi(settings.bodyWeightKg, settings.heightCm)
  const weights = measurements.filter((row) => row.kind === 'weight')
  const heights = measurements.filter((row) => row.kind === 'height')

  function begin(kind: 'weight' | 'height') {
    setEditing(kind)
    setInput(String(kind === 'weight' ? settings.bodyWeightKg ?? '' : settings.heightCm ?? ''))
    setError(null)
    measurementId.current = crypto.randomUUID()
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing || savingRef.current) return
    const value = editing === 'weight' ? parseBodyWeightKg(input) : parseHeightCm(input)
    if (value === null) {
      setError(editing === 'weight'
        ? 'Enter a body weight from 20 to 500 kg, to one decimal place.'
        : 'Enter a height from 80 to 250 cm as a whole number.')
      return
    }
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      if (editing === 'weight') await saveBodyWeight(value, measurementId.current ?? undefined)
      else await saveHeight(value, measurementId.current ?? undefined)
      measurementId.current = null
      setEditing(null)
    } catch {
      setError('Could not save this measurement. Try again.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function metric(kind: 'weight' | 'height', rows: BodyMeasurement[], current: number | null) {
    const unit = kind === 'weight' ? 'kg' : 'cm'
    const latest = rows[0]
    const date = latest && latest.value === current ? dateLabel(latest.recordedAt) : null
    return <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div><span className="text-[var(--accent-soft)]">{kind === 'weight' ? <Scale size={17} /> : <Ruler size={17} />}</span>
          <p className="mt-3 text-xs text-[var(--text-muted)]">Current {kind}</p>
          <p className="mt-1 font-semibold">{current === null ? 'Not set' : `${current.toFixed(kind === 'weight' ? 1 : 0)} ${unit}`}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{current === null ? 'No measurement yet' : date ? `Last recorded ${date}` : 'Last recorded date unavailable'}</p>
        </div>
        {status === 'loaded' && editing === null && <Button type="button" variant="secondary" onClick={() => begin(kind)} aria-label={`Add ${kind} measurement`}>Add</Button>}
      </div>
    </div>
  }

  function history(kind: 'weight' | 'height', rows: BodyMeasurement[]) {
    const unit = kind === 'weight' ? 'kg' : 'cm'
    return <div>
      <h3 className="text-sm font-semibold">{kind === 'weight' ? 'Weight' : 'Height'} History</h3>
      {rows.length === 0 ? <p className="mt-2 text-xs text-[var(--text-muted)]">No dated measurements yet.</p> :
        <ol className="mt-2 divide-y divide-[var(--border-subtle)] text-sm">
          {rows.slice(0, 5).map((row, index) => <li key={row.id} className="flex justify-between gap-3 py-2">
            <span className="text-[var(--text-muted)]">{dateLabel(row.recordedAt)}</span>
            <span className="text-right font-medium">{row.value.toFixed(kind === 'weight' ? 1 : 0)} {unit}{index === 0 && changeLabel(rows, unit) && <small className="block font-normal text-[var(--text-muted)]">{changeLabel(rows, unit)}</small>}</span>
          </li>)}
        </ol>}
    </div>
  }

  return <section aria-labelledby="body-metrics-heading" className="dashboard-card p-5 sm:p-6">
    <p className="section-label text-[var(--accent-soft)]">Profile</p>
    <h2 id="body-metrics-heading" className="mt-1 text-lg font-semibold">Body Metrics</h2>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {metric('weight', weights, settings.bodyWeightKg)}
      {metric('height', heights, settings.heightCm)}
    </div>
    {editing && <form onSubmit={(event) => void save(event)} className="mt-4 rounded-2xl border border-[var(--border-subtle)] p-4">
      <label className="form-label" htmlFor="body-measurement">{editing === 'weight' ? 'Weight (kg)' : 'Height (cm)'}</label>
      <input id="body-measurement" className="form-control" inputMode={editing === 'weight' ? 'decimal' : 'numeric'} value={input} onChange={(event) => setInput(event.target.value)} autoFocus aria-invalid={Boolean(error)} />
      {error && <InlineError message={error} />}
      <div className="mt-4 flex justify-end gap-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => { setEditing(null); measurementId.current = null }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save measurement'}</Button></div>
    </form>}
    <div className="mt-5 grid gap-5 sm:grid-cols-2">{history('weight', weights)}{history('height', heights)}</div>
    <div className="mt-5 rounded-2xl bg-[var(--accent-teal-wash)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-teal)]">BMI</p>{bmi === null ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Add height and weight to calculate BMI.</p> : <div className="mt-2 flex items-end justify-between gap-3"><p className="text-3xl font-semibold tracking-[-0.04em]">{bmi.toFixed(1)}</p><p className="text-right text-sm"><span className="block text-xs text-[var(--text-muted)]">Category</span><strong>{getBmiCategory(bmi)}</strong></p></div>}</div>
    <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">BMI is a general screening measure, not a medical diagnosis.</p>
  </section>
}
