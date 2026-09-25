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
  return <section className="dashboard-card mt-4 p-5 sm:p-6" aria-labelledby="weekly-reflection-heading"><p className="section-label">Reflection</p><h2 id="weekly-reflection-heading" className="mt-1 text-xl font-semibold">Notice, learn, choose</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Your words are saved for this week; summaries remain derived from authoritative records.</p>
    {status === 'loading' ? <div aria-label="Loading weekly reflection" className="mt-5 h-44 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" /> : <form className="mt-5 grid gap-4" onSubmit={submit}>
      <ReflectionField label="What went well?" value={reflection.wentWell} onChange={(wentWell) => setReflection((current) => ({ ...current, wentWell }))} />
      <ReflectionField label="What should improve?" value={reflection.improve} onChange={(improve) => setReflection((current) => ({ ...current, improve }))} />
      <ReflectionField label="What is next week's focus?" value={reflection.nextFocus} onChange={(nextFocus) => setReflection((current) => ({ ...current, nextFocus }))} />
      {status === 'error' && <p role="alert" className="text-sm text-[var(--danger)]">The reflection could not be loaded or saved. Try again.</p>}
      <div className="flex justify-end"><Button type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Saving...' : 'Save reflection'}</Button></div>
    </form>}
  </section>
}

function ReflectionField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="form-label">{label}<textarea className="form-control mt-1 min-h-24 resize-y" value={value} maxLength={2000} onChange={(event) => onChange(event.target.value)} /></label>
}
