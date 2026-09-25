import type { ReactNode } from 'react'
import { Dumbbell, Landmark, Sparkles } from 'lucide-react'
import { formatDuration } from '../../lib/format'
import { FinancialAmount } from '../privacy/FinancialAmount'

export function TodaySummary({ netCashflowSen, workouts, durationSeconds, animeUpdates, financeReady, exerciseReady, animeReady }: {
  netCashflowSen: number
  workouts: number
  durationSeconds: number
  animeUpdates: number
  financeReady: boolean
  exerciseReady: boolean
  animeReady: boolean
}) {
  return <section aria-label="Today summary" className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
    <Summary icon={<Landmark size={17} />} label="Month net" value={financeReady ? <FinancialAmount amountSen={netCashflowSen} interactive={false} /> : '—'} />
    <Summary icon={<Dumbbell size={17} />} label="This week" value={exerciseReady ? `${workouts} · ${formatDuration(durationSeconds)}` : '—'} />
    <Summary icon={<Sparkles size={17} />} label="Anime updates today" value={animeReady ? String(animeUpdates) : '—'} />
  </section>
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <article className="flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">{icon}</span>
    <div className="min-w-0"><p className="text-xs text-[var(--text-muted)]">{label}</p><div className="mt-1 truncate text-base font-semibold">{value}</div></div>
  </article>
}
