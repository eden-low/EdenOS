import type { ReactNode } from 'react'
import { ClipboardCheck, Dumbbell, Landmark, Sparkles } from 'lucide-react'
import { formatDuration } from '../../lib/format'
import { FinancialAmount } from '../privacy/FinancialAmount'

export function TodaySummary({ availableSen, allocationsSen, workouts, durationSeconds, animeUpdates, daysUntilReview, financeReady, exerciseReady, animeReady }: {
  availableSen: number
  allocationsSen: number
  workouts: number
  durationSeconds: number
  animeUpdates: number
  daysUntilReview: number
  financeReady: boolean
  exerciseReady: boolean
  animeReady: boolean
}) {
  return <section aria-label="Today summary" className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-4">
    <Summary icon={<Landmark size={17} />} label="Available money" value={financeReady ? <FinancialAmount amountSen={availableSen} interactive={false} /> : '—'} context={financeReady && allocationsSen > 0 ? <><FinancialAmount amountSen={allocationsSen} interactive={false} /> reserved for goals</> : 'After spending and goals'} />
    <Summary icon={<Dumbbell size={17} />} label="Weekly activity" value={exerciseReady ? `${workouts} ${workouts === 1 ? 'workout' : 'workouts'}` : '—'} context={exerciseReady ? formatDuration(durationSeconds) : 'This week'} />
    <Summary icon={<Sparkles size={17} />} label="Anime today" value={animeReady ? `${animeUpdates} ${animeUpdates === 1 ? 'update' : 'updates'}` : '—'} context="New catalogue activity" />
    <Summary icon={<ClipboardCheck size={17} />} label="Weekly review" value={daysUntilReview === 0 ? 'Ready now' : `${daysUntilReview} ${daysUntilReview === 1 ? 'day' : 'days'}`} context="Until the next week" />
  </section>
}

function Summary({ icon, label, value, context }: { icon: ReactNode; label: string; value: ReactNode; context: ReactNode }) {
  return <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3.5 shadow-[var(--shadow-soft)] sm:p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"><span className="text-[var(--accent-soft)]">{icon}</span><span>{label}</span></div>
    <div className="mt-3 truncate text-base font-semibold tracking-[-0.025em] sm:text-lg">{value}</div>
    <p className="mt-1 truncate text-[11px] text-[var(--text-muted)] sm:text-xs">{context}</p>
  </article>
}
