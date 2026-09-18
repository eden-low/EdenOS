import { CircleAlert, LoaderCircle, Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CaptureSheet } from '../components/capture/CaptureSheet'
import { triggerPressFeedback } from '../components/ui/pressFeedback'
import { ExpenseRecordDialog } from '../components/records/ExpenseRecordDialog'
import { ExerciseRecordDialog } from '../components/records/ExerciseRecordDialog'
import { ExerciseCalories } from '../components/exercise/ExerciseCalories'
import { Button } from '../components/ui/button'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { formatTime, relativeDayLabel } from '../lib/date'
import { getExerciseActivityIcon } from '../lib/exerciseIcon'
import { formatExerciseMetrics, formatMoney } from '../lib/format'
import { selectTimelineGroups } from '../selectors/recordSelectors'
import { useRecords } from '../state/useRecords'
import type { RecordDomainStatus, RecordFilter } from '../types/records'

const filters: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'exercise', label: 'Exercise' },
]

function DomainStatusNotice({
  label,
  status,
  error,
  onRetry,
}: {
  label: string
  status: RecordDomainStatus
  error: string | null
  onRetry: () => void
}) {
  if (status === 'loaded') return null

  return (
    <div
      role={status === 'error' ? 'alert' : 'status'}
      className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] py-4"
    >
      {status === 'loading' ? (
        <LoaderCircle aria-hidden="true" size={18} className="shrink-0 animate-spin text-[var(--text-muted)]" />
      ) : (
        <CircleAlert aria-hidden="true" size={18} className="shrink-0 text-[var(--danger)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {status === 'loading' ? `Loading ${label.toLowerCase()} records` : `${label} records unavailable`}
        </p>
        {status === 'error' && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {error ?? `${label} records are temporarily unavailable.`}
          </p>
        )}
      </div>
      {status === 'error' && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

export function RecordsPage() {
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
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const referenceDate = useLocalReferenceDate()
  const groups = useMemo(
    () =>
      selectTimelineGroups(
        expenseStatus === 'loaded' ? expenses : [],
        exerciseStatus === 'loaded' ? exerciseRecords : [],
        filter,
      ),
    [exerciseRecords, exerciseStatus, expenseStatus, expenses, filter],
  )
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId)
  const selectedExercise = exerciseRecords.find((exercise) => exercise.id === selectedExerciseId)
  const showExpenseStatus = filter !== 'exercise'
  const showExerciseStatus = filter !== 'expenses'
  const relevantStatuses = [
    ...(showExpenseStatus ? [expenseStatus] : []),
    ...(showExerciseStatus ? [exerciseStatus] : []),
  ]
  const hasRelevantLoading = relevantStatuses.includes('loading')
  const hasRelevantError = relevantStatuses.includes('error')

  return (
    <div className="core-page mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex items-end justify-between gap-5">
        <div>
          <p className="section-label">Eden OS</p>
          <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
            Records
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">Your activity history</p>
        </div>
        <CaptureSheet>
          <Button {...triggerPressFeedback} className="press-feedback hidden sm:inline-flex">
            <Plus aria-hidden="true" size={18} />
            Capture
          </Button>
        </CaptureSheet>
      </header>

      <div className="mt-8 flex gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-1.5 sm:inline-flex" role="tablist" aria-label="Record filters">
        {filters.map((item) => {
          const active = filter === item.value
          return (
            <button
              key={item.value}
              type="button"
              {...triggerPressFeedback}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.value)}
              className={`press-feedback min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:flex-none sm:px-4 ${
                active
                  ? 'bg-[var(--accent-wash-strong)] text-[var(--accent-soft)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="dashboard-card mt-4 overflow-hidden px-4 py-2 sm:px-7 lg:px-8">
        {showExpenseStatus && (
          <DomainStatusNotice
            label="Expense"
            status={expenseStatus}
            error={expenseError}
            onRetry={retryExpenseSubscription}
          />
        )}
        {showExerciseStatus && (
          <DomainStatusNotice
            label="Exercise"
            status={exerciseStatus}
            error={exerciseError}
            onRetry={retryExerciseSubscription}
          />
        )}
        {groups.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center py-14 text-center sm:py-18">
            <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-wash)] text-[var(--accent-soft)]">
              <ReceiptText aria-hidden="true" size={21} strokeWidth={1.8} />
            </span>
            <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {hasRelevantLoading
                ? 'Loading records'
                : hasRelevantError
                  ? 'No available records'
                  : 'No records here yet'}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {hasRelevantLoading
                ? 'Available activity will appear as it loads.'
                : hasRelevantError
                  ? 'Records from available sources will appear here.'
                  : 'Confirmed activity will appear here.'}
            </p>
            {!hasRelevantLoading && !hasRelevantError && (
              <CaptureSheet>
                <Button {...triggerPressFeedback} className="press-feedback mt-6">
                  <Plus aria-hidden="true" size={18} />
                  Capture a record
                </Button>
              </CaptureSheet>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.dateKey} className="py-6 first:pt-7">
              <div className="mb-2 flex items-center gap-4">
                <h2 className="shrink-0 text-sm font-semibold text-[var(--text-secondary)]">{group.label}</h2>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>

              <div className="divide-y divide-[var(--border-subtle)]">
                {group.records.map((item) => {
                  if (item.kind === 'expense') {
                    const expense = item.record
                    return (
                      <button
                        key={expense.id}
                        type="button"
                        {...triggerPressFeedback}
                        onClick={() => setSelectedExpenseId(expense.id)}
                        aria-label={`Open ${expense.title} expense`}
                        className="press-feedback group flex min-h-20 w-full items-center gap-3 rounded-xl px-2 py-4 text-left outline-none hover:bg-[var(--surface-secondary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:gap-4 sm:px-3"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
                          <ReceiptText aria-hidden="true" size={19} strokeWidth={1.8} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text-primary)]">{expense.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {expenseCategoryLabels[expense.category]}
                          </p>
                        </div>
                        <div className="ml-auto min-w-0 shrink-0 text-right">
                          <p className="font-semibold text-[var(--text-primary)]">{formatMoney(expense.amountSen)}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {relativeDayLabel(expense.occurredAt, referenceDate)} · {formatTime(expense.occurredAt)}
                          </p>
                        </div>
                      </button>
                    )
                  }

                  const exercise = item.record
                  const ExerciseIcon = getExerciseActivityIcon(exercise.activity)
                  return (
                    <button
                      key={exercise.id}
                      type="button"
                      {...triggerPressFeedback}
                      onClick={() => setSelectedExerciseId(exercise.id)}
                      aria-label={`Open ${exercise.activity} exercise`}
                      className="press-feedback group flex min-h-20 w-full items-center gap-3 rounded-xl px-2 py-4 text-left outline-none hover:bg-[var(--surface-secondary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:gap-4 sm:px-3"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
                        <ExerciseIcon aria-hidden="true" size={19} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-primary)]">{exercise.activity}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {formatExerciseMetrics(exercise.durationSeconds, exercise.distanceMetres)}
                        </p>
                        <ExerciseCalories compact exercise={exercise} />
                      </div>
                      <p className="ml-auto shrink-0 text-right text-xs text-[var(--text-muted)]">
                        {relativeDayLabel(exercise.occurredAt, referenceDate)} · {formatTime(exercise.occurredAt)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <ExpenseRecordDialog
        key={`expense-${selectedExpenseId ?? 'closed'}`}
        record={selectedExpense}
        onClose={() => setSelectedExpenseId(null)}
      />
      <ExerciseRecordDialog
        key={`exercise-${selectedExerciseId ?? 'closed'}`}
        record={selectedExercise}
        onClose={() => setSelectedExerciseId(null)}
      />
    </div>
  )
}
