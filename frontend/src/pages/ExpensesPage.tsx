import { ArrowDownRight, ArrowUpRight, CircleAlert, Layers3, WalletCards } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { FinancialAmount } from '../components/privacy/FinancialAmount'
import { Button } from '../components/ui/button'
import { expenseCategoryLabels } from '../domain/expense'
import { useLocalReferenceDate } from '../hooks/useLocalReferenceDate'
import { formatLongDate } from '../lib/date'
import { selectExpenseDashboard } from '../selectors/expenseDashboardSelectors'
import { useRecords } from '../state/useRecords'
import { useUserSettings } from '../state/useUserSettings'
import { selectMonthlySpendingTrend } from '../selectors/monthlySpendingTrend'
import { MonthlySpendingTrend } from '../components/expenses/MonthlySpendingTrend'

export function ExpensesPage({ onOpenRecords }: { onOpenRecords: () => void }) {
  const records = useRecords()
  const { settings, status: settingsStatus } = useUserSettings()
  const referenceDate = useLocalReferenceDate()
  const summary = useMemo(() => selectExpenseDashboard(records.expenses, settings, referenceDate), [records.expenses, referenceDate, settings])
  const trend = useMemo(() => selectMonthlySpendingTrend(records.expenses, referenceDate), [records.expenses, referenceDate])
  if (records.expenseStatus === 'error') return <Page><div role="alert" className="dashboard-card p-6"><CircleAlert className="text-[var(--danger)]" /><h2 className="mt-3 text-lg font-semibold">Expenses unavailable</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{records.expenseError}</p><Button className="mt-4" onClick={records.retryExpenseSubscription}>Retry</Button></div></Page>
  return <Page>
    <header><p className="section-label text-[var(--accent-soft)]">Finance</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Expenses</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">A clear view of this month’s spending and plans.</p></header>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Expense summary">
      <Metric label="Current month" value={<FinancialAmount amountSen={summary.monthSpentSen} className="metric-value text-2xl font-semibold" />} detail={`${summary.recordCount} ${summary.recordCount === 1 ? 'record' : 'records'}`} />
      <Metric label="Monthly Budget" value={summary.budgetSen === null ? 'Not configured' : <FinancialAmount amountSen={summary.budgetSen} className="metric-value text-2xl font-semibold" />} detail={summary.budgetRemainingSen === null ? 'Set in Today' : <><FinancialAmount amountSen={summary.budgetRemainingSen} /> remaining</>} />
      <Metric label="Savings Goal" value={summary.savingsGoalSen === null ? 'Not configured' : <FinancialAmount amountSen={summary.savingsGoalSen} className="metric-value text-2xl font-semibold" />} detail={settingsStatus === 'loaded' ? 'Configured target' : 'Loading settings…'} />
      <Metric label="Previous month" value={<FinancialAmount amountSen={summary.previousMonthSpentSen} className="metric-value text-2xl font-semibold" />} detail={summary.monthComparisonPercent === null ? 'No comparison available' : <span className={`inline-flex items-center gap-1 ${summary.monthComparisonPercent > 0 ? 'text-[var(--warning)]' : 'text-[var(--positive)]'}`}>{summary.monthComparisonPercent > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(summary.monthComparisonPercent)}% vs previous month</span>} />
    </section>
    {summary.budgetProgress !== null && <section className="dashboard-card mt-4 p-5"><div className="flex justify-between text-sm"><span>Budget used</span><span>{Math.round(summary.budgetProgress)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${summary.budgetProgress}%` }} /></div></section>}
    <MonthlySpendingTrend trend={trend} />
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <section className="dashboard-card p-5" aria-labelledby="expense-categories"><h2 id="expense-categories" className="section-label">Category breakdown</h2>{summary.categories.length ? <div className="mt-5 space-y-4">{summary.categories.map((item) => <div key={item.category}><div className="flex justify-between gap-3 text-sm"><span>{item.label}</span><FinancialAmount amountSen={item.spentSen} /></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--accent-blue)]" style={{ width: `${item.percentage}%` }} /></div></div>)}</div> : <Empty text="No expenses this month." />}</section>
      <section className="dashboard-card p-5" aria-labelledby="recent-expenses"><div className="flex items-center justify-between"><h2 id="recent-expenses" className="section-label">Recent Expenses</h2><button type="button" onClick={onOpenRecords} className="text-sm font-semibold text-[var(--accent-soft)]">View Records</button></div>{summary.recent.length ? <ul className="mt-3 divide-y divide-[var(--border-subtle)]">{summary.recent.map((item) => <li key={item.id} className="flex items-center gap-3 py-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)]"><WalletCards size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="text-xs text-[var(--text-muted)]">{expenseCategoryLabels[item.category]} · {formatLongDate(item.occurredAt)}</span></span><FinancialAmount amountSen={item.amountSen} className="text-sm font-semibold" /></li>)}</ul> : <Empty text="No recent expenses." />}</section>
    </div>
  </Page>
}

function Page({ children }: { children: ReactNode }) { return <div className="core-page mx-auto w-full max-w-[80rem] px-4 py-5 sm:px-6 lg:px-8">{children}</div> }
function Metric({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) { return <article className="dashboard-card p-5"><p className="section-label">{label}</p><div className="mt-3 min-h-8 text-[var(--text-primary)]">{value}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{detail}</div></article> }
function Empty({ text }: { text: string }) { return <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-muted)]"><Layers3 size={16} />{text}</div> }
