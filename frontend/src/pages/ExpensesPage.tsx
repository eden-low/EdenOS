import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleAlert, FileInput, Landmark, ReceiptText, Target, WalletCards } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { CashflowChart } from '../components/finance/CashflowChart'
import { ExpenseActivityDonut } from '../components/finance/ExpenseActivityDonut'
import { FinanceEntryDialog } from '../components/finance/FinanceEntryDialogs'
import { IncomeRecordDialog } from '../components/finance/IncomeRecordDialog'
import { BatchImportDialog } from '../components/finance/BatchImportDialog'
import { MoneySettingsDialog } from '../components/dashboard/MoneySettingsDialog'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { ExpenseRecordDialog } from '../components/records/ExpenseRecordDialog'
import { Button } from '../components/ui/button'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { formatLongDate } from '../lib/date'
import { usePrivacyLock } from '../privacy/usePrivacyLock'
import { selectFinanceSummary } from '../selectors/financeSelectors'
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
  const referenceDate = useLocalReferenceDate()
  const privacy = usePrivacyLock()
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12))
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null)
  const [batchImportOpen, setBatchImportOpen] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)
  const [oldestFirst, setOldestFirst] = useState(false)
  const summary = useMemo(() => selectFinanceSummary(
    records.expenseStatus === 'loaded' ? records.expenses : [],
    records.incomeStatus === 'loaded' ? records.incomes : [],
    settings,
    selectedMonth,
  ), [records.expenseStatus, records.expenses, records.incomeStatus, records.incomes, selectedMonth, settings])
  const transactions = oldestFirst ? [...summary.transactions].reverse() : summary.transactions
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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="section-label text-[var(--accent-soft)]">Finance</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Expenses</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Income, expenses, budget, and goals—without pretending to be a bank balance.</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => openEntry('expense')}><ArrowUpRight size={17} />Add Expense</Button><Button variant="secondary" onClick={() => openEntry('income')}><ArrowDownLeft size={17} />Add Income</Button><Button onClick={openBatchImport}><FileInput size={17} />Batch Import</Button></div>
    </header>

    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3 sm:w-fit">
      <CalendarDays size={17} className="text-[var(--text-muted)]" />
      <label htmlFor="finance-month" className="text-sm font-semibold">Reporting month</label>
      <input id="finance-month" type="month" value={summary.monthInput} max={`${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`} onChange={(event) => { const next = parseMonth(event.target.value); if (next) setSelectedMonth(next) }} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]" />
    </div>

    {(records.expenseStatus === 'error' || records.incomeStatus === 'error') && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-4"><CircleAlert size={18} className="text-[var(--danger)]" /><p className="min-w-0 flex-1 text-sm">{records.expenseStatus === 'error' ? records.expenseError : records.incomeError}</p><Button variant="secondary" onClick={records.expenseStatus === 'error' ? records.retryExpenseSubscription : records.retryIncomeSubscription}>Retry</Button></div>}

    <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Finance summary">
      <SummaryCard icon={<Landmark size={19} />} label="Net Cashflow" value={summary.netCashflowSen} detail={summary.hasPreviousData ? <Comparison current={summary.netCashflowSen} previous={summary.previousNetCashflowSen} /> : 'No comparison available'} tone="violet" />
      <SummaryCard icon={<ArrowDownLeft size={19} />} label="Total Income" value={summary.monthlyIncomeSen} detail={summary.previousIncomeSen > 0 ? <Comparison current={summary.monthlyIncomeSen} previous={summary.previousIncomeSen} /> : 'No comparison available'} tone="green" />
      <SummaryCard icon={<WalletCards size={19} />} label="Total Expenses" value={summary.monthlyExpensesSen} detail={summary.previousExpensesSen > 0 ? <Comparison current={summary.monthlyExpensesSen} previous={summary.previousExpensesSen} /> : 'No comparison available'} tone="blue" />
      <article className="finance-summary-card finance-summary-card-amber"><div className="flex items-start justify-between gap-3"><p className="section-label">Savings Goal</p><span className="finance-summary-icon"><Target size={19} /></span></div><div className="mt-4">{summary.savingsGoalSen === null ? <span className="text-xl font-semibold">Not configured</span> : <FinancialAmount amountSen={summary.savingsGoalSen} className="metric-value text-2xl font-semibold" />}</div><p className="mt-2 text-xs text-[var(--text-muted)]">Configured target—not an account balance</p></article>
    </section>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]"><CashflowChart data={summary.cashflow} monthLabel={summary.monthLabel} /><ExpenseActivityDonut summary={summary} /></div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]">
      <section className="dashboard-card overflow-hidden" aria-labelledby="transaction-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-5 sm:px-6"><div><p className="section-label">Activity</p><h2 id="transaction-title" className="mt-1 text-lg font-semibold">Transaction History</h2></div><div className="flex items-center gap-1 rounded-xl bg-[var(--surface-secondary)] p-1" role="group" aria-label="Transaction order"><button type="button" onClick={() => setOldestFirst(false)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${!oldestFirst ? 'bg-[var(--surface-elevated)] shadow-sm' : 'text-[var(--text-muted)]'}`}>Recent</button><button type="button" onClick={() => setOldestFirst(true)} className={`min-h-9 rounded-lg px-3 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] ${oldestFirst ? 'bg-[var(--surface-elevated)] shadow-sm' : 'text-[var(--text-muted)]'}`}>Oldest</button></div></div>
        {transactions.length === 0 ? <div className="m-5 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-center"><ReceiptText size={20} className="text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">No transactions in {summary.monthLabel}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Add a real income or expense record to begin.</p></div> : <div className="divide-y divide-[var(--border-subtle)]">{transactions.map((transaction) => <button key={`${transaction.direction}-${transaction.id}`} type="button" onClick={() => setSelection({ kind: transaction.direction, id: transaction.id })} className="grid min-h-18 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[var(--focus)] sm:px-6"><span className={`grid size-10 place-items-center rounded-xl ${transaction.direction === 'income' ? 'bg-[var(--accent-teal-wash)] text-[var(--positive)]' : 'bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]'}`}>{transaction.direction === 'income' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{transaction.description}</span><span className="block truncate text-xs text-[var(--text-muted)]">{transaction.direction === 'income' ? 'Income' : 'Expense'} · {transaction.category} · {formatLongDate(transaction.date)}</span></span><FinancialAmount amountSen={transaction.amountSen} prefix={transaction.direction === 'income' ? '+' : '-'} interactive={false} className={`text-sm font-semibold ${transaction.direction === 'income' ? 'text-[var(--positive)]' : ''}`} /></button>)}</div>}
        <div className="border-t border-[var(--border-subtle)] p-4 text-center"><button type="button" onClick={onOpenRecords} className="min-h-10 rounded-xl px-4 text-sm font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">View all EdenOS records</button></div>
      </section>

      <section className="dashboard-card p-5 sm:p-6" aria-labelledby="goals-title"><p className="section-label">Plans</p><h2 id="goals-title" className="mt-1 text-lg font-semibold">My Goals</h2>
        <Goal label="Monthly Budget" amount={summary.budgetSen} detail={summary.budgetRemainingSen === null ? 'Configure a monthly expense budget.' : <><FinancialAmount amountSen={summary.monthlyExpensesSen} /> used · <FinancialAmount amountSen={summary.budgetRemainingSen} /> remaining</>} progress={summary.budgetProgress} action={<MoneySettingsDialog kind="budget" />} />
        <Goal label="Savings Goal" amount={summary.savingsGoalSen} detail="Configured savings target. EdenOS does not infer an actual savings balance." progress={null} action={<MoneySettingsDialog kind="savings" />} />
      </section>
    </div>

    {entryKind && <FinanceEntryDialog key={entryKind} kind={entryKind} open onClose={() => setEntryKind(null)} />}
    <BatchImportDialog key={batchImportOpen ? 'batch-open' : 'batch-closed'} open={batchImportOpen} onClose={() => setBatchImportOpen(false)} />
    <ExpenseRecordDialog key={`expense-${selection?.id ?? 'closed'}`} record={selectedExpense} onClose={() => setSelection(null)} />
    <IncomeRecordDialog key={`income-${selection?.id ?? 'closed'}`} record={selectedIncome} onClose={() => setSelection(null)} />
  </Page>
}

function Page({ children }: { children: ReactNode }) { return <div className="core-page mx-auto w-full max-w-[88rem] px-4 py-5 sm:px-6 lg:px-8">{children}</div> }
function SummaryCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: number; detail: ReactNode; tone: 'violet' | 'green' | 'blue' }) { return <article className={`finance-summary-card finance-summary-card-${tone}`}><div className="flex items-start justify-between gap-3"><p className="section-label">{label}</p><span className="finance-summary-icon">{icon}</span></div><FinancialAmount amountSen={value} className="metric-value mt-4 text-2xl font-semibold" /><div className="mt-2 text-xs text-[var(--text-muted)]">{detail}</div></article> }
function Comparison({ current, previous }: { current: number; previous: number }) { const difference = current - previous; return <span><FinancialAmount amountSen={difference} prefix={difference > 0 ? '+' : ''} interactive={false} /> vs previous month</span> }
function Goal({ label, amount, detail, progress, action }: { label: string; amount: number | null; detail: ReactNode; progress: number | null; action: ReactNode }) { return <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{label}</p><div className="mt-1 text-lg font-semibold">{amount === null ? 'Not configured' : <FinancialAmount amountSen={amount} />}</div></div>{action}</div><div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{detail}</div>{progress !== null && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-primary)]"><div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-right text-[0.7rem] text-[var(--text-muted)]">{Math.round(progress)}% used</p></>}</div> }
