import { ChevronLeft, ChevronRight, Dumbbell, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { EstimatedCalories } from '../components/exercise/EstimatedCalories'
import { triggerPressFeedback } from '../components/ui/pressFeedback'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { addLocalWeeks, formatDateHeading, formatTime, startOfLocalWeek } from '../lib/date'
import { formatDuration, formatExerciseMetrics, formatMoney } from '../lib/format'
import { selectWeeklyReview } from '../selectors/weeklyReviewSelectors'
import { useRecords } from '../state/useRecords'
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
  const {
    expenses,
    exerciseRecords,
    expenseStatus,
    expenseError,
    exerciseStatus,
    exerciseError,
    retryExpenseSubscription,
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
    ),
    [expenses, expenseStatus, exerciseRecords, exerciseStatus, selectedWeekStart],
  )

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
          {expenseStatus === 'loaded' ? (
            <>
              <p className="metric-value mt-5 text-3xl font-semibold">{formatMoney(summary.expenses.spentSen)}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {summary.expenses.count} {summary.expenses.count === 1 ? 'expense' : 'expenses'} recorded
              </p>
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
                        <dd className="font-semibold text-[var(--text-primary)]">{formatMoney(spentSen)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </>
          ) : (
            <DomainUnavailable
              label="Expense"
              status={expenseStatus}
              error={expenseError}
              onRetry={retryExpenseSubscription}
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
                          <EstimatedCalories compact exercise={session} />
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
    </div>
  )
}
