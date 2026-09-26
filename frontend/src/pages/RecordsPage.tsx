import { ArrowDownLeft, CircleAlert, LoaderCircle, PlayCircle, Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CaptureSheet } from '../components/capture/CaptureSheet'
import { ExerciseCalories } from '../components/exercise/ExerciseCalories'
import { IncomeRecordDialog } from '../components/finance/IncomeRecordDialog'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { ExpenseRecordDialog } from '../components/records/ExpenseRecordDialog'
import { ExerciseRecordDialog } from '../components/records/ExerciseRecordDialog'
import { Button } from '../components/ui/button'
import { triggerPressFeedback } from '../components/ui/pressFeedback'
import { expenseCategoryLabels } from '../domain/expense'
import { incomeCategoryLabels } from '../domain/income'
import { formatTime } from '../lib/date'
import { getExerciseActivityIcon } from '../lib/exerciseIcon'
import { formatExerciseMetrics } from '../lib/format'
import { selectTimelineGroups } from '../selectors/recordSelectors'
import { useAnimeProgress } from '../state/useAnimeProgress'
import { useRecords } from '../state/useRecords'
import type { RecordDomainStatus, RecordFilter } from '../types/records'

const filters: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'anime', label: 'Anime' },
]

function DomainStatusNotice({ label, status, error, onRetry }: { label: string; status: RecordDomainStatus; error: string | null; onRetry: () => void }) {
  if (status === 'loaded') return null
  return <div role={status === 'error' ? 'alert' : 'status'} className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] py-4">
    {status === 'loading' ? <LoaderCircle aria-hidden="true" size={18} className="shrink-0 animate-spin text-[var(--text-muted)]" /> : <CircleAlert aria-hidden="true" size={18} className="shrink-0 text-[var(--danger)]" />}
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--text-primary)]">{status === 'loading' ? `Loading ${label.toLowerCase()} records` : `${label} records unavailable`}</p>{status === 'error' && <p className="mt-1 text-sm text-[var(--text-secondary)]">{error ?? `${label} records are temporarily unavailable.`}</p>}</div>
    {status === 'error' && <Button type="button" variant="secondary" onClick={onRetry}>Retry</Button>}
  </div>
}

export function RecordsPage() {
  const animeProgress = useAnimeProgress()
  const { expenses, incomes, exerciseRecords, expenseStatus, expenseError, incomeStatus, incomeError, exerciseStatus, exerciseError, retryExpenseSubscription, retryIncomeSubscription, retryExerciseSubscription } = useRecords()
  const [filter, setFilter] = useState<RecordFilter>('all')
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const groups = useMemo(() => selectTimelineGroups(expenseStatus === 'loaded' ? expenses : [], exerciseStatus === 'loaded' ? exerciseRecords : [], filter, incomeStatus === 'loaded' ? incomes : [], animeProgress.items), [animeProgress.items, exerciseRecords, exerciseStatus, expenseStatus, expenses, filter, incomeStatus, incomes])
  const selectedExpense = expenses.find((expense) => expense.id === selectedExpenseId)
  const selectedExercise = exerciseRecords.find((exercise) => exercise.id === selectedExerciseId)
  const selectedIncome = incomes.find((income) => income.id === selectedIncomeId)
  const showExpenseStatus = filter === 'all' || filter === 'expenses'
  const showIncomeStatus = filter === 'all' || filter === 'income'
  const showExerciseStatus = filter === 'all' || filter === 'exercise'
  const relevantStatuses = [...(showExpenseStatus ? [expenseStatus] : []), ...(showIncomeStatus ? [incomeStatus] : []), ...(showExerciseStatus ? [exerciseStatus] : [])]
  const hasRelevantLoading = relevantStatuses.includes('loading')
  const hasRelevantError = relevantStatuses.includes('error')

  return <div className="core-page mx-auto w-full max-w-[68rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="section-label">History</p><h1 className="mt-3 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)]">Records</h1><p className="mt-3 max-w-xl text-sm text-[var(--text-secondary)] sm:text-base">A chronological view of confirmed activity across EdenOS.</p></div>
      <CaptureSheet><Button {...triggerPressFeedback} className="press-feedback self-start sm:self-auto"><Plus aria-hidden="true" size={18} />Capture</Button></CaptureSheet>
    </header>

    <div className="mt-7 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-1.5 sm:inline-flex" role="tablist" aria-label="Record filters">
      {filters.map((item) => { const active = filter === item.value; return <button key={item.value} type="button" {...triggerPressFeedback} role="tab" aria-selected={active} onClick={() => setFilter(item.value)} className={`press-feedback min-h-11 flex-none rounded-xl px-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] sm:px-4 ${active ? 'bg-[var(--accent-wash-strong)] text-[var(--accent-soft)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}>{item.label}</button> })}
    </div>

    <section aria-label="Activity timeline" className="mt-5">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 sm:px-6">
        {showExpenseStatus && <DomainStatusNotice label="Expense" status={expenseStatus} error={expenseError} onRetry={retryExpenseSubscription} />}
        {showExerciseStatus && <DomainStatusNotice label="Exercise" status={exerciseStatus} error={exerciseError} onRetry={retryExerciseSubscription} />}
        {showIncomeStatus && <DomainStatusNotice label="Income" status={incomeStatus} error={incomeError} onRetry={retryIncomeSubscription} />}
      </div>

      {groups.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--surface-primary)] px-5 py-12 text-center sm:py-16"><span className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]"><ReceiptText aria-hidden="true" size={20} /></span><p className="text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{hasRelevantLoading ? 'Loading records' : hasRelevantError ? 'No available records' : 'No records here yet'}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{hasRelevantLoading ? 'Available activity will appear as it loads.' : hasRelevantError ? 'Records from available sources will appear here.' : 'Confirmed activity will appear here.'}</p>{!hasRelevantLoading && !hasRelevantError && <CaptureSheet><Button {...triggerPressFeedback} className="press-feedback mt-6"><Plus aria-hidden="true" size={18} />Capture a record</Button></CaptureSheet>}</div> : <div className="mt-7 space-y-8">{groups.map((group) => <section key={group.dateKey} aria-labelledby={`date-${group.dateKey}`}><div className="mb-2 flex items-center gap-4"><h2 id={`date-${group.dateKey}`} className="shrink-0 text-sm font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{group.label}</h2><div className="h-px flex-1 bg-[var(--border-subtle)]" /></div><div className="divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">{group.records.map((item) => {
          if (item.kind === 'expense') { const expense = item.record; return <TimelineButton key={expense.id} time={formatTime(expense.occurredAt)} icon={<ReceiptText size={16} />} tone="purple" domain="Finance" title={expense.title} detail={expenseCategoryLabels[expense.category]} value={<FinancialAmount amountSen={expense.amountSen} prefix="−" interactive={false} className="font-semibold" />} onClick={() => setSelectedExpenseId(expense.id)} ariaLabel={`Open ${expense.title} expense`} /> }
          if (item.kind === 'income') { const income = item.record; return <TimelineButton key={income.id} time={formatTime(income.occurredAt)} icon={<ArrowDownLeft size={16} />} tone="green" domain="Income" title={income.description} detail={incomeCategoryLabels[income.category]} value={<FinancialAmount amountSen={income.amountSen} prefix="+" interactive={false} className="font-semibold text-[var(--positive)]" />} onClick={() => setSelectedIncomeId(income.id)} ariaLabel={`Open ${income.description} income`} /> }
          if (item.kind === 'anime') { const anime = item.record; return <TimelineRow key={`anime-${anime.externalId}`} time={formatTime(item.occurredAt)} icon={<PlayCircle size={16} />} tone="purple" domain="Anime" title={anime.title} detail={anime.trackingStatus === 'completed' ? 'Completed' : anime.trackingStatus === 'planned' ? 'Added to plan' : 'Progressed'} /> }
          const exercise = item.record; const ExerciseIcon = getExerciseActivityIcon(exercise.activity); return <TimelineButton key={exercise.id} time={formatTime(exercise.occurredAt)} icon={<ExerciseIcon size={16} />} tone="teal" domain="Exercise" title={exercise.activity} detail={<><span>{formatExerciseMetrics(exercise.durationSeconds, exercise.distanceMetres)}</span><ExerciseCalories compact exercise={exercise} /></>} onClick={() => setSelectedExerciseId(exercise.id)} ariaLabel={`Open ${exercise.activity} exercise`} />
        })}</div></section>)}</div>}
    </section>

    <ExpenseRecordDialog key={`expense-${selectedExpenseId ?? 'closed'}`} record={selectedExpense} onClose={() => setSelectedExpenseId(null)} />
    <ExerciseRecordDialog key={`exercise-${selectedExerciseId ?? 'closed'}`} record={selectedExercise} onClose={() => setSelectedExerciseId(null)} />
    <IncomeRecordDialog key={`income-${selectedIncomeId ?? 'closed'}`} record={selectedIncome} onClose={() => setSelectedIncomeId(null)} />
  </div>
}

function TimelineButton({ onClick, ariaLabel, ...props }: TimelineProps & { onClick: () => void; ariaLabel: string }) {
  return <button type="button" {...triggerPressFeedback} onClick={onClick} aria-label={ariaLabel} className="press-feedback block w-full rounded-xl text-left outline-none hover:bg-[var(--surface-secondary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"><TimelineRow {...props} /></button>
}

interface TimelineProps { time: string; icon: ReactNode; tone: 'purple' | 'teal' | 'green'; domain: string; title: string; detail: ReactNode; value?: ReactNode }
function TimelineRow({ time, icon, tone, domain, title, detail, value }: TimelineProps) {
  const tones = { purple: 'bg-[var(--accent-wash)] text-[var(--accent-soft)]', teal: 'bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]', green: 'bg-[var(--positive-wash)] text-[var(--positive)]' }
  return <div className="grid min-h-20 grid-cols-[3.4rem_minmax(0,1fr)] items-center gap-x-3 px-1 py-3 sm:grid-cols-[4.25rem_2rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-2"><time className="self-start pt-1 text-sm font-semibold tabular-nums text-[var(--text-primary)] sm:self-center sm:pt-0">{time}</time><span className={`grid size-8 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span><div className="min-w-0"><span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{domain}</span><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p><div className="mt-0.5 text-xs text-[var(--text-secondary)]">{detail}</div></div>{value && <div className="col-start-2 mt-1 justify-self-start text-sm sm:col-start-4 sm:row-start-1 sm:mt-0 sm:justify-self-end">{value}</div>}</div>
}
