import { ArrowRight, Dumbbell, Landmark, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { matchingDestinations, parseCommand } from '../../domain/command'
import { isExpenseCategory } from '../../domain/expense'
import { matchingFinanceRule } from '../../domain/financeRules'
import { isIncomeCategory } from '../../domain/income'
import { formatLongDate, formatTime } from '../../lib/date'
import { formatDuration, formatMoneyExact } from '../../lib/format'
import { createFirestoreAnimeRepository } from '../../repositories/firestoreAnimeRepository'
import { useFirebaseAuth } from '../../state/useFirebaseAuth'
import { useRecords } from '../../state/useRecords'
import { useFinanceRules } from '../../state/useFinanceRules'
import type { AnimeSummary } from '../../types/anime'
import type { ExpenseData, ExerciseData, IncomeData } from '../../types/records'
import type { AppPage } from '../layout/Navigation'
import { ExpenseForm } from '../capture/ExpenseForm'
import { ExerciseForm } from '../capture/ExerciseForm'
import { IncomeForm } from '../finance/IncomeForm'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'

type Candidate =
  | { kind: 'expense'; data: ExpenseData }
  | { kind: 'income'; data: IncomeData }
  | { kind: 'exercise'; data: ExerciseData }

export function CommandPalette({ open, onClose, onNavigate, onAnimeSearch }: {
  open: boolean
  onClose: () => void
  onNavigate: (page: AppPage) => void
  onAnimeSearch: (query: string) => void
}) {
  const { firestore } = useFirebaseAuth()
  const records = useRecords()
  const { rules } = useFinanceRules()
  const repository = useMemo(() => createFirestoreAnimeRepository(firestore), [firestore])
  const [input, setInput] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [editing, setEditing] = useState(false)
  const [animeResults, setAnimeResults] = useState<AnimeSummary[]>([])
  const [animeStatus, setAnimeStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intent = useMemo(() => {
    const parsed = parseCommand(input)
    if (parsed.kind === 'expense') {
      const rule = matchingFinanceRule(parsed.data.title, 'expense', rules)
      return rule && isExpenseCategory(rule.category) ? { ...parsed, data: { ...parsed.data, category: rule.category } } : parsed
    }
    if (parsed.kind === 'income') {
      const rule = matchingFinanceRule(parsed.data.description, 'income', rules)
      return rule && isIncomeCategory(rule.category) ? { ...parsed, data: { ...parsed.data, category: rule.category } } : parsed
    }
    return parsed
  }, [input, rules])
  const destinations = useMemo(() => matchingDestinations(input), [input])

  useEffect(() => {
    if (!open || candidate || intent.kind !== 'anime-search' || intent.query.length < 2) return
    let active = true
    const timer = window.setTimeout(() => {
      setAnimeStatus('loading')
      void repository.searchTitles(intent.query, 6)
        .then((items) => { if (active) { setAnimeResults(items); setAnimeStatus('idle') } })
        .catch(() => { if (active) setAnimeStatus('error') })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [candidate, intent, open, repository])

  function runIntent(event?: FormEvent) {
    event?.preventDefault()
    const current = parseCommand(input)
    if (current.kind === 'navigation') { onNavigate(current.page); onClose(); return }
    if (current.kind === 'expense' || current.kind === 'income') { setCandidate(current); setEditing(false); return }
    if (current.kind === 'exercise') {
      setCandidate(null)
      setEditing(true)
      return
    }
    if (current.kind === 'anime-search' && current.query) { onAnimeSearch(current.query); onClose() }
  }

  async function confirm() {
    if (!candidate || saving) return
    setSaving(true); setError(null)
    try {
      if (candidate.kind === 'expense') await records.createExpense(candidate.data)
      else if (candidate.kind === 'income') await records.createIncome(candidate.data)
      else await records.createExercise(candidate.data)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'This command could not be saved. Review it and try again.')
    } finally { setSaving(false) }
  }

  const expenseEditData = candidate?.kind === 'expense' ? candidate.data : intent.kind === 'expense' ? intent.data : null
  const incomeEditData = candidate?.kind === 'income' ? candidate.data : intent.kind === 'income' ? intent.data : null
  const exerciseIntent = intent.kind === 'exercise' ? intent : null
  return <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) onClose() }}>
    <DialogContent closeDisabled={saving} className="sm:w-[min(42rem,calc(100vw-2rem))]" aria-describedby="command-description">
      <DialogTitle className="pr-12 text-xl font-semibold">Command EdenOS</DialogTitle>
      <DialogDescription id="command-description" className="mt-2 text-sm text-[var(--text-secondary)]">Navigate, search, or prepare a record. Nothing is saved without confirmation.</DialogDescription>

      {!candidate && !editing && <>
        <form className="relative mt-5" onSubmit={runIntent}><Search aria-hidden="true" size={18} className="absolute left-4 top-3.5 text-[var(--text-muted)]" /><input autoFocus aria-label="EdenOS command" className="form-control pl-11" value={input} onChange={(event) => { setInput(event.target.value); setAnimeResults([]); setAnimeStatus('idle') }} placeholder="Search or type a command…" /><span className="pointer-events-none absolute right-3 top-3 rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">Esc</span></form>
        {intent.kind === 'expense' || intent.kind === 'income' ? <button type="button" onClick={() => { setCandidate(intent); setEditing(false) }} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><Landmark size={18} className="text-[var(--accent-soft)]" /><span className="flex-1"><strong className="block text-sm">Review {intent.kind}</strong><span className="text-xs text-[var(--text-muted)]">Candidate only · confirmation required</span></span><ArrowRight size={16} /></button> : intent.kind === 'exercise' ? <button type="button" onClick={() => setEditing(true)} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><Dumbbell size={18} className="text-[var(--accent-teal)]" /><span className="flex-1"><strong className="block text-sm">Log {intent.activity}</strong><span className="text-xs text-[var(--text-muted)]">Add duration and review</span></span><ArrowRight size={16} /></button> : null}
        {destinations.length > 0 && <section className="mt-5"><p className="section-label">Go to</p><div className="mt-2 grid gap-1 sm:grid-cols-2">{destinations.map((item) => <button type="button" key={item.page} onClick={() => { onNavigate(item.page); onClose() }} className="flex min-h-11 items-center justify-between rounded-xl px-3 text-left text-sm font-medium outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">{item.label}<ArrowRight size={15} className="text-[var(--text-muted)]" /></button>)}</div></section>}
        {intent.kind === 'anime-search' && <section className="mt-5"><p className="section-label">Anime</p>{animeStatus === 'loading' ? <p role="status" className="mt-3 text-sm text-[var(--text-muted)]">Searching catalogue…</p> : animeStatus === 'error' ? <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Anime search is temporarily unavailable.</p> : <div className="mt-2 space-y-1">{animeResults.map((anime) => <button type="button" key={anime.externalId} onClick={() => { onAnimeSearch(anime.title); onClose() }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><Sparkles size={16} className="text-[var(--accent-soft)]" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{anime.title}</span><span className="text-xs text-[var(--text-muted)]">{anime.year ?? ''}</span></button>)}</div>}<Button type="button" variant="ghost" className="mt-2" onClick={() => { onAnimeSearch(intent.query); onClose() }}>Search Anime for “{intent.query}”</Button></section>}
      </>}

      {editing && expenseEditData && <div className="mt-5"><ExpenseForm initialData={expenseEditData} submitLabel="Review candidate" onSubmit={(data) => { setCandidate({ kind: 'expense', data }); setEditing(false) }} onCancel={() => { setCandidate(null); setEditing(false) }} /></div>}
      {editing && incomeEditData && <div className="mt-5"><IncomeForm initialData={incomeEditData} submitLabel="Review candidate" onSubmit={(data) => { setCandidate({ kind: 'income', data }); setEditing(false) }} onCancel={() => { setCandidate(null); setEditing(false) }} /></div>}
      {editing && exerciseIntent && <div className="mt-5"><ExerciseForm initialData={{ activity: exerciseIntent.activity, occurredAt: new Date().toISOString(), source: 'text' }} submitLabel="Review candidate" onSubmit={(data) => { setCandidate({ kind: 'exercise', data }); setEditing(false) }} onCancel={() => setEditing(false)} /></div>}

      {candidate && !editing && <div className="mt-5"><CandidateReview candidate={candidate} error={error} /><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setEditing(true)} disabled={saving}>Edit</Button><Button type="button" onClick={() => void confirm()} disabled={saving}>{saving ? 'Confirming…' : `Confirm ${candidate.kind}`}</Button></div></div>}
    </DialogContent>
  </Dialog>
}

function CandidateReview({ candidate, error }: { candidate: Candidate; error: string | null }) {
  const title = candidate.kind === 'expense' ? candidate.data.title : candidate.kind === 'income' ? candidate.data.description : candidate.data.activity
  const occurredAt = candidate.data.occurredAt
  return <section aria-label={`${candidate.kind} candidate review`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"><p className="section-label">Review candidate</p><h3 className="mt-3 text-xl font-semibold">{title}</h3>{candidate.kind === 'expense' || candidate.kind === 'income' ? <p className="mt-2 text-3xl font-semibold">{formatMoneyExact(candidate.data.amountSen)}</p> : <p className="mt-2 text-lg font-semibold">{formatDuration(candidate.data.durationSeconds)}</p>}<p className="mt-4 text-sm text-[var(--text-secondary)]">{formatLongDate(occurredAt)} · {formatTime(occurredAt)}</p><p className="mt-4 rounded-xl bg-[var(--warning-wash)] p-3 text-xs text-[var(--text-secondary)]">This is not a saved record. Check every field before confirming.</p>{error && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{error}</p>}</section>
}
