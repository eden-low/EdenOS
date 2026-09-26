import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createFirestoreWeeklyReviewRepository } from '../../repositories/firestoreWeeklyReviewRepository'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import type { WeeklyReviewReflectionData } from '../../types/weeklyReview'
import { Button } from '../ui/button'

const emptyReflection: WeeklyReviewReflectionData = { wentWell: '', improve: '', nextFocus: '' }

export function WeeklyReflection({ weekKey }: { weekKey: string }) {
  const { firestore, uid } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreWeeklyReviewRepository(firestore, uid), [firestore, uid])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'saving'>('loading')
  const [reflection, setReflection] = useState(emptyReflection)
  useEffect(() => repository.subscribe(weekKey, {
    next: (value) => { setReflection(value ?? emptyReflection); setStatus('ready') },
    error: () => setStatus('error'),
  }), [repository, weekKey])
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus('saving')
    try { await repository.save(weekKey, reflection); setStatus('ready') } catch { setStatus('error') }
  }
  return <section className="dashboard-card mt-6 overflow-hidden p-5 sm:p-7 lg:p-8" aria-labelledby="weekly-reflection-heading"><div className="max-w-2xl"><p className="section-label text-[var(--accent-soft)]">Reflection</p><h2 id="weekly-reflection-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Notice, learn, choose</h2><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">The numbers above are context. This is the part that turns the week into something useful.</p><p className="mt-1 text-xs text-[var(--text-muted)]">Your words are saved for this week; summaries remain derived from authoritative records.</p></div>
    {status === 'loading' ? <div aria-label="Loading weekly reflection" className="mt-5 h-44 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" /> : <form className="mt-5 grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 md:grid-cols-2"><ReflectionField label="What went well?" value={reflection.wentWell} onChange={(wentWell) => setReflection((current) => ({ ...current, wentWell }))} /><ReflectionField label="What should improve?" value={reflection.improve} onChange={(improve) => setReflection((current) => ({ ...current, improve }))} /></div>
      <ReflectionField label="What is next week's focus?" value={reflection.nextFocus} onChange={(nextFocus) => setReflection((current) => ({ ...current, nextFocus }))} />
      {status === 'error' && <p role="alert" className="text-sm text-[var(--danger)]">The reflection could not be loaded or saved. Try again.</p>}
      <div className="flex justify-end"><Button type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Saving...' : 'Save reflection'}</Button></div>
    </form>}
  </section>
}

function ReflectionField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="form-label">{label}<textarea className="form-control mt-2 min-h-28 resize-y bg-[var(--surface-secondary)]" value={value} maxLength={2000} onChange={(event) => onChange(event.target.value)} /></label>
}
