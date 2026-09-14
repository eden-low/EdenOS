import { Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CaptureSheet } from '../components/capture/CaptureSheet'
import { ExpenseRecordDialog } from '../components/records/ExpenseRecordDialog'
import { ExerciseRecordDialog } from '../components/records/ExerciseRecordDialog'
import { Button } from '../components/ui/button'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { formatTime, relativeDayLabel } from '../lib/date'
import { getExerciseActivityIcon } from '../lib/exerciseIcon'
import { formatExerciseMetrics, formatMoney } from '../lib/format'
import { selectTimelineGroups } from '../selectors/recordSelectors'
import { useRecords } from '../state/useRecords'
import type { RecordFilter } from '../types/records'

const filters: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'exercise', label: 'Exercise' },
]

export function RecordsPage() {
  const { expenses, exerciseRecords } = useRecords()
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const referenceDate = useLocalReferenceDate()
  const groups = useMemo(
    () => selectTimelineGroups(expenses, exerciseRecords, filter),
    [exerciseRecords, expenses, filter],
  )
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId)
  const selectedExercise = exerciseRecords.find((exercise) => exercise.id === selectedExerciseId)

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex items-end justify-between gap-5">
        <div>
          <p className="section-label">Eden OS</p>
          <h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">
            Records
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">Your activity history</p>
        </div>
        <CaptureSheet>
          <Button className="hidden sm:inline-flex">
            <Plus aria-hidden="true" size={18} />
            Capture
          </Button>
        </CaptureSheet>
      </header>

      <div className="mt-8 flex gap-2" role="tablist" aria-label="Record filters">
        {filters.map((item) => {
          const active = filter === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(item.value)}
              className={`min-h-11 rounded-xl px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${
                active
                  ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="dashboard-card mt-5 overflow-hidden px-5 py-2 sm:px-7 lg:px-8">
        {groups.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-[var(--text-primary)]">No records here yet</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Confirmed activity will appear here.</p>
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
                        onClick={() => setSelectedExpenseId(expense.id)}
                        aria-label={`Open ${expense.title} expense`}
                        className="group flex min-h-20 w-full items-center gap-3 rounded-xl py-4 text-left outline-none transition-colors hover:px-3 hover:bg-[var(--surface-secondary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:gap-4"
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
                        <div className="ml-auto shrink-0 text-right">
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
                      onClick={() => setSelectedExerciseId(exercise.id)}
                      aria-label={`Open ${exercise.activity} exercise`}
                      className="group flex min-h-20 w-full items-center gap-3 rounded-xl py-4 text-left outline-none transition-colors hover:px-3 hover:bg-[var(--surface-secondary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:gap-4"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
                        <ExerciseIcon aria-hidden="true" size={19} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--text-primary)]">{exercise.activity}</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {formatExerciseMetrics(exercise.durationSeconds, exercise.distanceMetres)}
                        </p>
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
        key={selectedExpenseId ?? 'closed'}
        record={selectedExpense}
        onClose={() => setSelectedExpenseId(null)}
      />
      <ExerciseRecordDialog
        key={selectedExerciseId ?? 'closed'}
        record={selectedExercise}
        onClose={() => setSelectedExerciseId(null)}
      />
    </div>
  )
}
