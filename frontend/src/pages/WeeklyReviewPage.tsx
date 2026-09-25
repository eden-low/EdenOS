import { ChevronLeft, ChevronRight, Dumbbell, PlayCircle, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { WeeklyReflection } from '../components/review/WeeklyReflection'
import { ExerciseCalories } from '../components/exercise/ExerciseCalories'
import { triggerPressFeedback } from '../components/ui/pressFeedback'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { addLocalWeeks, formatDateHeading, formatTime, localDateKey, startOfLocalWeek } from '../lib/date'
import { formatDistance, formatDuration, formatExerciseMetrics } from '../lib/format'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { selectWeeklyReview } from '../selectors/weeklyReviewSelectors'
import { useRecords } from '../state/useRecords'
import { useAnimeProgress } from '../state/useAnimeProgress'
import type { RecordDomainStatus } from '../types/records'

const weekDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function DomainUnavailable({
  label,
  status,
  error,
  onRetry,
}: {
  label: string
  status: Exclude<RecordDomainStatus, 'loaded'>
  error: string | null
  onRetry: () => void
}) {
  return (
    <div role={status === 'error' ? 'alert' : 'status'} className="mt-7">
      <p className="text-lg font-semibold text-[var(--text-primary)]">
        {status === 'loading' ? `Loading ${label.toLowerCase()} records` : `${label} records unavailable`}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {status === 'loading'
          ? 'Your weekly summary will appear when the records load.'
          : error ?? `${label} records are temporarily unavailable.`}
      </p>
      {status === 'error' && (
        <Button type="button" variant="secondary" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

export function WeeklyReviewPage() {
  const animeProgress = useAnimeProgress()
  const {
    expenses,
    incomes,
    exerciseRecords,
    expenseStatus,
    expenseError,
    incomeStatus,
    incomeError,
    exerciseStatus,
    exerciseError,
    retryExpenseSubscription,
    retryIncomeSubscription,
    retryExerciseSubscription,
  } = useRecords()
  const referenceDate = useLocalReferenceDate()
  const [weekOffset, setWeekOffset] = useState(0)
  const selectedWeekStart = useMemo(
    () => addLocalWeeks(startOfLocalWeek(referenceDate), weekOffset),
    [referenceDate, weekOffset],
  )
  const weekEnd = new Date(selectedWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const summary = useMemo(
    () => selectWeeklyReview(
      expenseStatus === 'loaded' ? expenses : [],
      exerciseStatus === 'loaded' ? exerciseRecords : [],
      selectedWeekStart,
      incomeStatus === 'loaded' ? incomes : [],
      animeProgress.items,
    ),
    [animeProgress.items, expenses, expenseStatus, exerciseRecords, exerciseStatus, incomeStatus, incomes, selectedWeekStart],
  )
  const financeUnavailable: { label: string; status: Exclude<RecordDomainStatus, 'loaded'>; error: string | null; retry: () => void } | null =
    expenseStatus !== 'loaded' ? { label: 'Expense', status: expenseStatus, error: expenseError, retry: retryExpenseSubscription }
      : incomeStatus !== 'loaded' ? { label: 'Income', status: incomeStatus, error: incomeError, retry: retryIncomeSubscription }
        : null

  return (
    <div className="core-page mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header>
        <p className="section-label">Eden OS</p>
        <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
          Weekly Review
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          What your confirmed records show for one week.
        </p>
      </header>

      <section aria-label="Select week" className="dashboard-card mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
        <div className="min-w-0">
          <p className="section-label text-[var(--accent-soft)]">{weekOffset === 0 ? 'This week' : 'Selected week'}</p>
          <p className="metric-value mt-2 text-[clamp(1rem,4vw,1.35rem)] font-semibold leading-snug text-[var(--text-primary)]">
            {weekDateFormatter.format(selectedWeekStart)} – {weekDateFormatter.format(weekEnd)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Monday to Sunday</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button {...triggerPressFeedback} type="button" variant="secondary" aria-label="Previous week" className="press-feedback min-w-0 px-3 sm:px-5" onClick={() => setWeekOffset((offset) => offset - 1)}>
            <ChevronLeft aria-hidden="true" size={17} /> Previous<span className="hidden sm:inline"> week</span>
          </Button>
          {weekOffset < 0 && (
            <Button {...triggerPressFeedback} type="button" variant="ghost" className="press-feedback col-span-2 order-3 sm:order-none" onClick={() => setWeekOffset(0)}>
              This week
            </Button>
          )}
          <Button
            {...triggerPressFeedback}
            type="button"
            variant="secondary"
            aria-label="Next week"
            className="press-feedback min-w-0 px-3 sm:px-5"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((offset) => offset + 1)}
          >
            Next<span className="hidden sm:inline"> week</span> <ChevronRight aria-hidden="true" size={17} />
          </Button>
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section aria-label="Weekly expenses" className="dashboard-card border-t-2 border-t-[var(--accent-blue)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="section-label">Expenses</p>
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]">
              <ReceiptText aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
          </div>
          {expenseStatus === 'loaded' && incomeStatus === 'loaded' ? (
            <>
              <FinancialAmount amountSen={summary.expenses.spentSen} className="metric-value mt-5 text-3xl font-semibold" />
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {summary.expenses.count} {summary.expenses.count === 1 ? 'expense' : 'expenses'} recorded
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--surface-secondary)] p-3"><p className="text-xs text-[var(--text-muted)]">Income</p><FinancialAmount amountSen={summary.finance.incomeSen} className="mt-1 font-semibold" /></div><div className="rounded-xl bg-[var(--surface-secondary)] p-3"><p className="text-xs text-[var(--text-muted)]">Net</p><FinancialAmount amountSen={summary.finance.netSen} className="mt-1 font-semibold" /></div></div>
              {summary.finance.spendingChangePercent !== null && <p className="mt-3 text-xs text-[var(--text-muted)]">Spending {summary.finance.spendingChangePercent >= 0 ? '+' : ''}{summary.finance.spendingChangePercent}% vs last week</p>}
              {summary.expenses.count === 0 ? (
                <p className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-sm text-[var(--text-secondary)]">
                  No expenses recorded this week.
                </p>
              ) : (
                <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">By category</h2>
                  <dl className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {summary.expenses.categories.map(({ category, count, spentSen }) => (
                      <div key={category} className="flex items-center justify-between gap-4 py-3 text-sm">
                        <dt className="text-[var(--text-secondary)]">
                          {expenseCategoryLabels[category]} <span className="text-[var(--text-muted)]">({count})</span>
                        </dt>
                        <dd><FinancialAmount amountSen={spentSen} className="font-semibold text-[var(--text-primary)]" /></dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          ) : (
            <DomainUnavailable
              label={financeUnavailable!.label}
              status={financeUnavailable!.status}
              error={financeUnavailable!.error}
              onRetry={financeUnavailable!.retry}
            />
          )}
        </section>

        <section aria-label="Weekly exercise sessions" className="dashboard-card border-t-2 border-t-[var(--accent-teal)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="section-label">Exercise</p>
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
              <Dumbbell aria-hidden="true" size={19} strokeWidth={1.8} />
            </span>
          </div>
          {exerciseStatus === 'loaded' ? (
            <>
              <p className="metric-value mt-5 text-3xl font-semibold">
                {summary.exercise.count}{' '}
                <span className="text-lg font-medium text-[var(--text-muted)]">
                  {summary.exercise.count === 1 ? 'session' : 'sessions'}
                </span>
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {summary.exercise.count > 0
                  ? `${formatDuration(summary.exercise.durationSeconds)} total duration`
                  : 'No exercise recorded this week.'}
              </p>
              {summary.exercise.distanceMetres > 0 && <p className="mt-2 text-sm text-[var(--text-secondary)]">{formatDistance(summary.exercise.distanceMetres)} total distance</p>}
              {summary.exercise.durationChangePercent !== null && <p className="mt-2 text-xs text-[var(--text-muted)]">Duration {summary.exercise.durationChangePercent >= 0 ? '+' : ''}{summary.exercise.durationChangePercent}% vs last week</p>}
              {summary.exercise.count > 0 && (
                <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sessions</h2>
                  <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {summary.exercise.sessions.map((session) => (
                      <li key={session.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{session.activity}</p>
                          <p className="mt-1 text-[var(--text-muted)]">
                            {formatDateHeading(session.occurredAt)} · {formatTime(session.occurredAt)}
                          </p>
                          <ExerciseCalories compact exercise={session} />
                        </div>
                        <p className="text-[var(--text-secondary)]">
                          {formatExerciseMetrics(session.durationSeconds, session.distanceMetres)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <DomainUnavailable
              label="Exercise"
              status={exerciseStatus}
              error={exerciseError}
              onRetry={retryExerciseSubscription}
            />
          )}
        </section>
      </div>
      <section aria-label="Weekly Anime progress" className="dashboard-card mt-4 border-t-2 border-t-[var(--accent-soft)] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="section-label">Anime</p><h2 className="mt-1 text-lg font-semibold">Latest progress this week</h2></div><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]"><PlayCircle size={19} /></span></div>{summary.anime.progressed.length ? <ul className="mt-4 divide-y divide-[var(--border-subtle)]">{summary.anime.progressed.map((item) => <li key={item.externalId} className="py-3 text-sm"><strong>{item.title}</strong><span className="ml-2 text-[var(--text-muted)]">{item.trackingStatus === 'completed' ? 'completed this week' : item.trackingStatus === 'planned' ? 'added to plan this week' : 'progressed this week'}</span></li>)}</ul> : <p className="mt-4 text-sm text-[var(--text-muted)]">No title progress updated this week.</p>}<p className="mt-3 text-xs text-[var(--text-muted)]">Based on each title's latest progress update; this does not claim an exact episode count.</p></section>
      <WeeklyReflection weekKey={localDateKey(selectedWeekStart)} />
    </div>
  )
}
