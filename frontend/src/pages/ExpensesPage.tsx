import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleAlert, FileInput } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CashflowChart } from '../components/finance/CashflowChart'
import { ExpenseActivityDonut } from '../components/finance/ExpenseActivityDonut'
import { BatchImportDialog } from '../components/finance/BatchImportDialog'
import { FinanceBudgetsPanel } from '../components/finance/FinanceBudgetsPanel'
import { FinanceKpiGrid, GoalBudgetSummary, RecentTransactionsCard } from '../components/finance/FinanceDashboard'
import { FinanceEntryDialog } from '../components/finance/FinanceEntryDialogs'
import { FinanceGoalsPanel } from '../components/finance/FinanceGoalsPanel'
import { FinanceRulesPanel } from '../components/finance/FinanceRulesPanel'
import { IncomeRecordDialog } from '../components/finance/IncomeRecordDialog'
import { MonthStory } from '../components/finance/MonthStory'
import { ExpenseRecordDialog } from '../components/records/ExpenseRecordDialog'
import { Button } from '../components/ui/button'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { usePrivacyLock } from '../privacy/usePrivacyLock'
import { selectFinanceSummary } from '../selectors/financeSelectors'
import { useFinancePlanning } from '../state/useFinancePlanning'
import { useGoalAllocations } from '../state/useGoalAllocations'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'

type EntryKind = 'expense' | 'income'
type Selection = { kind: EntryKind; id: string } | null

function parseMonth(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1]); const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return new Date(year, month - 1, 1, 12)
}

export function ExpensesPage({ onOpenRecords }: { onOpenRecords: () => void }) {
  const records = useRecords()
  const { settings } = useUserSettings()
  const planning = useFinancePlanning()
  const referenceDate = useLocalReferenceDate()
  const privacy = usePrivacyLock()
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12))
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null)
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)
  const { allocations } = useGoalAllocations(selectedMonth)
  const summary = useMemo(() => selectFinanceSummary(
    records.expenseStatus === 'loaded' ? records.expenses : [],
    records.incomeStatus === 'loaded' ? records.incomes : [],
    settings,
    selectedMonth,
    { budgets: planning.budgets, allocations },
  ), [allocations, planning.budgets, records.expenseStatus, records.expenses, records.incomeStatus, records.incomes, selectedMonth, settings])
  const selectedExpense = selection?.kind === 'expense' ? records.expenses.find((record) => record.id === selection.id) : undefined
  const selectedIncome = selection?.kind === 'income' ? records.incomes.find((record) => record.id === selection.id) : undefined

  function openEntry(kind: EntryKind) {
    if (privacy.locked) privacy.requestUnlock()
    else setEntryKind(kind)
  }

  function openBatchImport() {
    if (privacy.locked) privacy.requestUnlock()
    else setBatchImportOpen(true)
  }

  return <Page>
    <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div><p className="section-label text-[var(--accent-soft)]">Eden OS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Finance</h1><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">A clear monthly view of income, actual spending, available money, goals, and budgets.</p></div>
      <div className="grid gap-3 sm:justify-items-end">
        <div className="flex flex-wrap gap-2"><Button onClick={() => openEntry('expense')}><ArrowUpRight size={17} />Add Expense</Button><Button variant="secondary" onClick={() => openEntry('income')}><ArrowDownLeft size={17} />Add Income</Button><Button variant="ghost" onClick={openBatchImport}><FileInput size={17} />Batch Import</Button></div>
        <div className="grid min-h-11 grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 min-[360px]:flex min-[360px]:py-0">
          <CalendarDays size={16} className="shrink-0 text-[var(--text-muted)]" />
          <label htmlFor="finance-month" className="text-xs font-semibold text-[var(--text-secondary)]">Reporting month</label>
          <input id="finance-month" type="month" value={summary.monthInput} max={`${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`} onChange={(event) => { const next = parseMonth(event.target.value); if (next) setSelectedMonth(next) }} className="col-span-2 min-h-9 w-full min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] min-[360px]:w-auto" />
        </div>
      </div>
    </header>

    {(records.expenseStatus === 'error' || records.incomeStatus === 'error') && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-4"><CircleAlert size={18} className="text-[var(--danger)]" /><p className="min-w-0 flex-1 text-sm">{records.expenseStatus === 'error' ? records.expenseError : records.incomeError}</p><Button variant="secondary" onClick={records.expenseStatus === 'error' ? records.retryExpenseSubscription : records.retryIncomeSubscription}>Retry</Button></div>}

    <FinanceKpiGrid summary={summary} />

    <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]"><CashflowChart data={summary.cashflow} monthLabel={summary.monthLabel} /><ExpenseActivityDonut summary={summary} /></div>

    <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)_minmax(0,0.92fr)]">
      <RecentTransactionsCard transactions={summary.transactions} monthLabel={summary.monthLabel} onSelect={(transaction) => setSelection({ kind: transaction.direction, id: transaction.id })} onViewAll={onOpenRecords} />
      <GoalBudgetSummary summary={summary.budgetPlan} />
      <div className="md:col-span-2 xl:col-span-1"><MonthStory summary={summary} /></div>
    </div>

    <section id="finance-planning-management" className="mt-10 border-t border-[var(--border-subtle)] pt-8" aria-labelledby="finance-planning-heading">
      <p className="section-label text-[var(--accent-soft)]">Planning tools</p><h2 id="finance-planning-heading" className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Manage goals and budgets</h2><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Edit targets, record explicit allocations, and configure category-linked monthly pots.</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2"><FinanceGoalsPanel /><FinanceBudgetsPanel summary={summary.budgetPlan} /></div>
    </section>

    <FinanceRulesPanel />

    {entryKind && <FinanceEntryDialog key={entryKind} kind={entryKind} open onClose={() => setEntryKind(null)} />}
    <BatchImportDialog key={batchImportOpen ? 'batch-open' : 'batch-closed'} open={batchImportOpen} onClose={() => setBatchImportOpen(false)} />
    <ExpenseRecordDialog key={`expense-${selection?.id ?? 'closed'}`} record={selectedExpense} onClose={() => setSelection(null)} />
    <IncomeRecordDialog key={`income-${selection?.id ?? 'closed'}`} record={selectedIncome} onClose={() => setSelection(null)} />
  </Page>
}

function Page({ children }: { children: ReactNode }) { return <div className="core-page mx-auto w-full max-w-[92rem] px-4 py-5 sm:px-6 lg:px-8">{children}</div> }
