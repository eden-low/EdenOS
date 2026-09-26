import { ChevronLeft, ChevronRight, Dumbbell, PlayCircle, ReceiptText } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { WeeklyReflection } from '../components/review/WeeklyReflection'
import { Button } from '../components/ui/button'
import { triggerPressFeedback } from '../components/ui/pressFeedback'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { addLocalWeeks, localDateKey, startOfLocalWeek } from '../lib/date'
import { formatDistance, formatDuration } from '../lib/format'
import { selectWeeklyReview } from '../selectors/weeklyReviewSelectors'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { useRecords } from '../state/useRecords'
import type { RecordDomainStatus } from '../types/records'

const weekDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function DomainUnavailable({ label, status, error, onRetry }: { label: string; status: Exclude<RecordDomainStatus, 'loaded'>; error: string | null; onRetry: () => void }) {
  return <div role={status === 'error' ? 'alert' : 'status'} className="mt-5 rounded-2xl bg-[var(--surface-secondary)] p-4">
    <p className="text-sm font-semibold text-[var(--text-primary)]">{status === 'loading' ? `Loading ${label.toLowerCase()} records` : `${label} records unavailable`}</p>
    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{status === 'loading' ? 'This context will appear when the records load.' : error ?? `${label} records are temporarily unavailable.`}</p>
    {status === 'error' && <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>Retry</Button>}
  </div>
}

export function WeeklyReviewPage() {
  const animeProgress = useAnimeProgress()
  const { expenses, incomes, exerciseRecords, expenseStatus, expenseError, incomeStatus, incomeError, exerciseStatus, exerciseError, retryExpenseSubscription, retryIncomeSubscription, retryExerciseSubscription } = useRecords()
  const referenceDate = useLocalReferenceDate()
  const [weekOffset, setWeekOffset] = useState(0)
  const selectedWeekStart = useMemo(() => addLocalWeeks(startOfLocalWeek(referenceDate), weekOffset), [referenceDate, weekOffset])
  const weekEnd = new Date(selectedWeekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const summary = useMemo(() => selectWeeklyReview(expenseStatus === 'loaded' ? expenses : [], exerciseStatus === 'loaded' ? exerciseRecords : [], selectedWeekStart, incomeStatus === 'loaded' ? incomes : [], animeProgress.items), [animeProgress.items, expenses, expenseStatus, exerciseRecords, exerciseStatus, incomeStatus, incomes, selectedWeekStart])
  const financeUnavailable: { label: string; status: Exclude<RecordDomainStatus, 'loaded'>; error: string | null; retry: () => void } | null = expenseStatus !== 'loaded' ? { label: 'Expense', status: expenseStatus, error: expenseError, retry: retryExpenseSubscription } : incomeStatus !== 'loaded' ? { label: 'Income', status: incomeStatus, error: incomeError, retry: retryIncomeSubscription } : null

  return <div className="core-page mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
    <header className="py-1 sm:py-2">
      <p className="section-label">Reflection</p>
      <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">Weekly Review</h1>
      <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">Use the week’s confirmed records as context, then decide what comes next.</p>
    </header>

    <section aria-label="Select week" className="mt-7 flex flex-col gap-5 border-y border-[var(--border-subtle)] py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0"><div className="flex items-center gap-2"><p className="section-label text-[var(--accent-soft)]">{weekOffset === 0 ? 'This week' : 'Selected week'}</p><span className="rounded-full bg-[var(--positive-wash)] px-2 py-1 text-[10px] font-semibold text-[var(--positive)]">{weekOffset === 0 ? 'Ready to reflect' : 'Past review'}</span></div><p className="mt-2 text-[clamp(1.05rem,4vw,1.35rem)] font-semibold leading-snug tracking-[-0.025em] text-[var(--text-primary)]">{weekDateFormatter.format(selectedWeekStart)} – {weekDateFormatter.format(weekEnd)}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Monday to Sunday</p></div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"><Button {...triggerPressFeedback} type="button" variant="secondary" aria-label="Previous week" className="press-feedback min-w-0 px-3 sm:px-5" onClick={() => setWeekOffset((offset) => offset - 1)}><ChevronLeft aria-hidden="true" size={17} /> Previous<span className="hidden sm:inline"> week</span></Button>{weekOffset < 0 && <Button {...triggerPressFeedback} type="button" variant="ghost" className="press-feedback col-span-2 order-3 sm:order-none" onClick={() => setWeekOffset(0)}>This week</Button>}<Button {...triggerPressFeedback} type="button" variant="secondary" aria-label="Next week" className="press-feedback min-w-0 px-3 sm:px-5" disabled={weekOffset === 0} onClick={() => setWeekOffset((offset) => offset + 1)}>Next<span className="hidden sm:inline"> week</span> <ChevronRight aria-hidden="true" size={17} /></Button></div>
    </section>

    <section aria-labelledby="week-glance-heading" className="mt-7">
      <div><p className="section-label">This week at a glance</p><h2 id="week-glance-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">Context for your reflection</h2></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section aria-label="Weekly expenses" className="dashboard-card p-5 sm:p-6">
          <ReviewCardHeader icon={<ReceiptText size={18} />} tone="blue" label="Finance" title="Money in motion" />
          {financeUnavailable ? <DomainUnavailable label={financeUnavailable.label} status={financeUnavailable.status} error={financeUnavailable.error} onRetry={financeUnavailable.retry} /> : <><div className="mt-5 grid grid-cols-3 gap-2"><MoneyStat label="Income" amountSen={summary.finance.incomeSen} /><MoneyStat label="Spent" amountSen={summary.finance.spentSen} /><MoneyStat label="Net" amountSen={summary.finance.netSen} /></div>{summary.expenses.count === 0 ? <p className="mt-5 text-sm text-[var(--text-secondary)]">No expenses recorded this week.</p> : <p className="mt-5 text-sm text-[var(--text-secondary)]">{summary.expenses.count} {summary.expenses.count === 1 ? 'expense' : 'expenses'} recorded{summary.expenses.categories[0] ? ` · ${expenseCategoryLabels[summary.expenses.categories[0].category]} was the largest category` : ''}.</p>}{summary.finance.spendingChangePercent !== null && <p className="mt-2 text-xs text-[var(--text-muted)]">Spending {summary.finance.spendingChangePercent >= 0 ? '+' : ''}{summary.finance.spendingChangePercent}% vs last week</p>}</>}
        </section>

        <section aria-label="Weekly exercise sessions" className="dashboard-card p-5 sm:p-6">
          <ReviewCardHeader icon={<Dumbbell size={18} />} tone="teal" label="Exercise" title="Movement and consistency" />
          {exerciseStatus !== 'loaded' ? <DomainUnavailable label="Exercise" status={exerciseStatus} error={exerciseError} onRetry={retryExerciseSubscription} /> : <><div className="mt-5 grid grid-cols-3 gap-2"><TextStat label="Workouts" value={String(summary.exercise.count)} /><TextStat label="Minutes" value={summary.exercise.durationSeconds ? formatDuration(summary.exercise.durationSeconds) : '0 min'} /><TextStat label="Distance" value={summary.exercise.distanceMetres ? formatDistance(summary.exercise.distanceMetres) : '0 m'} /></div>{summary.exercise.count === 0 ? <p className="mt-5 text-sm text-[var(--text-secondary)]">No exercise recorded this week.</p> : <p className="mt-5 text-sm text-[var(--text-secondary)]">Latest: <strong className="text-[var(--text-primary)]">{summary.exercise.sessions[0]?.activity}</strong></p>}{summary.exercise.durationChangePercent !== null && <p className="mt-2 text-xs text-[var(--text-muted)]">Duration {summary.exercise.durationChangePercent >= 0 ? '+' : ''}{summary.exercise.durationChangePercent}% vs last week</p>}</>}
        </section>

        <section aria-label="Weekly Anime progress" className="dashboard-card p-5 sm:p-6">
          <ReviewCardHeader icon={<PlayCircle size={18} />} tone="purple" label="Anime" title="Progress, accurately stated" />
          <div className="mt-5 grid grid-cols-2 gap-2"><TextStat label="Titles progressed" value={String(summary.anime.progressed.length)} /><TextStat label="Completed" value={String(summary.anime.completed.length)} /></div>
          {summary.anime.progressed.length ? <ul className="mt-4 space-y-2">{summary.anime.progressed.slice(0, 3).map((item) => <li key={item.externalId} className="text-sm"><strong>{item.title}</strong><span className="block text-xs text-[var(--text-muted)]">{item.trackingStatus === 'completed' ? 'Completed this week' : item.trackingStatus === 'planned' ? 'Added to plan this week' : 'Progressed this week'}</span></li>)}</ul> : <p className="mt-5 text-sm text-[var(--text-secondary)]">No title progress updated this week.</p>}
          <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">Based on each title’s latest progress update; no unsupported episode count is inferred.</p>
        </section>
      </div>
    </section>

    <WeeklyReflection weekKey={localDateKey(selectedWeekStart)} />
  </div>
}

function ReviewCardHeader({ icon, tone, label, title }: { icon: ReactNode; tone: 'blue' | 'teal' | 'purple'; label: string; title: string }) {
  const tones = { blue: 'bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]', teal: 'bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]', purple: 'bg-[var(--accent-wash)] text-[var(--accent-soft)]' }
  return <div className="flex items-start justify-between gap-3"><div><p className="section-label">{label}</p><h3 className="mt-1 font-semibold">{title}</h3></div><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span></div>
}

function MoneyStat({ label, amountSen }: { label: string; amountSen: number }) { return <div className="min-w-0 rounded-xl bg-[var(--surface-secondary)] p-2.5"><p className="text-[10px] text-[var(--text-muted)] sm:text-xs">{label}</p><FinancialAmount amountSen={amountSen} className="mt-1 block whitespace-nowrap text-xs font-semibold sm:text-[13px]" /></div> }
function TextStat({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[var(--surface-secondary)] p-2.5"><p className="text-[10px] text-[var(--text-muted)] sm:text-xs">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div> }
