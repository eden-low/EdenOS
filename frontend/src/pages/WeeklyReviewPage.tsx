import { ChevronLeft, ChevronRight, Dumbbell, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
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
    <div className="mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header>
        <p className="section-label">Eden OS</p>
        <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
          Weekly Review
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
          What your confirmed records show for one week.
        </p>
      </header>

      <section aria-label="Select week" className="dashboard-card mt-8 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="section-label">{weekOffset === 0 ? 'This week' : 'Selected week'}</p>
          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
            {weekDateFormatter.format(selectedWeekStart)} – {weekDateFormatter.format(weekEnd)}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Monday to Sunday</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setWeekOffset((offset) => offset - 1)}>
            <ChevronLeft aria-hidden="true" size={17} /> Previous week
          </Button>
          {weekOffset < 0 && (
            <Button type="button" variant="ghost" onClick={() => setWeekOffset(0)}>
              This week
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((offset) => offset + 1)}
          >
            Next week <ChevronRight aria-hidden="true" size={17} />
          </Button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section aria-label="Weekly expenses" className="dashboard-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="section-label">Expenses</p>
            <ReceiptText aria-hidden="true" size={20} className="text-[var(--accent-blue)]" />
          </div>
          {expenseStatus === 'loaded' ? (
            <>
              <p className="metric-value mt-6 text-3xl font-semibold">{formatMoney(summary.expenses.spentSen)}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {summary.expenses.count} {summary.expenses.count === 1 ? 'expense' : 'expenses'} recorded
              </p>
              {summary.expenses.count === 0 ? (
                <p className="mt-7 border-t border-[var(--border-subtle)] pt-5 text-sm text-[var(--text-secondary)]">
                  No expenses recorded this week.
                </p>
              ) : (
                <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
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

        <section aria-label="Weekly exercise sessions" className="dashboard-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="section-label">Exercise</p>
            <Dumbbell aria-hidden="true" size={20} className="text-[var(--accent-teal)]" />
          </div>
          {exerciseStatus === 'loaded' ? (
            <>
              <p className="metric-value mt-6 text-3xl font-semibold">
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
                <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sessions</h2>
                  <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {summary.exercise.sessions.map((session) => (
                      <li key={session.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 text-sm">
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{session.activity}</p>
                          <p className="mt-1 text-[var(--text-muted)]">
                            {formatDateHeading(session.occurredAt)} · {formatTime(session.occurredAt)}
                          </p>
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
