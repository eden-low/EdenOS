import { ArrowDownLeft, ArrowRight, ArrowUpRight, Landmark, ReceiptText, Target, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { goalProgress } from '../../domain/financePlanning'
import { formatLongDate } from '../../lib/date'
import type { FinanceSummary, FinanceTransaction } from '../../selectors/financeSelectors'
import { useFinancePlanning } from '../../state/useFinancePlanning'
import type { FinanceBudget } from '../../types/finance'
import { FinancialAmount } from '../privacy/FinancialAmount'

export function FinanceKpiGrid({ summary }: { summary: FinanceSummary }) {
  return <section className="mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Finance summary">
    <KpiCard icon={<WalletCards size={18} />} label="Available Money" value={summary.availableSen} tone="violet" context={<>After <FinancialAmount amountSen={summary.goalAllocationsSen} interactive={false} /> goal allocations</>} />
    <KpiCard icon={<ArrowDownLeft size={18} />} label="Income" value={summary.monthlyIncomeSen} tone="green" context={summary.hasPreviousData ? <Difference current={summary.monthlyIncomeSen} previous={summary.previousIncomeSen} subject="last month" /> : 'Income received this month'} />
    <KpiCard icon={<ArrowUpRight size={18} />} label="Expenses" value={summary.monthlyExpensesSen} tone="blue" context={summary.hasPreviousData ? <Difference current={summary.monthlyExpensesSen} previous={summary.previousExpensesSen} subject="last month" /> : 'Confirmed spending this month'} />
    <KpiCard icon={<Landmark size={18} />} label="Net Cashflow" value={summary.netCashflowSen} tone="amber" context={summary.monthlyIncomeSen > 0 ? `${Math.round(summary.savingsRatePercent ?? 0)}% of income after expenses` : 'Income minus actual expenses'} />
  </section>
}

function KpiCard({ icon, label, value, context, tone }: { icon: ReactNode; label: string; value: number; context: ReactNode; tone: 'violet' | 'green' | 'blue' | 'amber' }) {
  return <article className={`finance-summary-card finance-summary-card-${tone}`} data-finance-kpi={label}>
    <div className="flex items-start justify-between gap-3"><p className="section-label">{label}</p><span className="finance-summary-icon">{icon}</span></div>
    <FinancialAmount amountSen={value} className="metric-value mt-3 text-[1.7rem] font-semibold leading-none sm:text-3xl" />
    <div className="mt-3 min-h-5 text-xs leading-5 text-[var(--text-muted)]">{context}</div>
  </article>
}

function Difference({ current, previous, subject }: { current: number; previous: number; subject: string }) {
  const difference = current - previous
  if (difference === 0) return <span>Unchanged from {subject}</span>
  return <span><FinancialAmount amountSen={Math.abs(difference)} interactive={false} /> {difference > 0 ? 'higher' : 'lower'} than {subject}</span>
}

export function RecentTransactionsCard({ transactions, monthLabel, onSelect, onViewAll }: {
  transactions: FinanceTransaction[]
  monthLabel: string
  onSelect: (transaction: FinanceTransaction) => void
  onViewAll: () => void
}) {
  const recent = transactions.slice(0, 5)
  return <section className="dashboard-card flex min-h-0 flex-col overflow-hidden" aria-labelledby="recent-transactions-heading">
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
      <div><p className="section-label">Activity</p><h2 id="recent-transactions-heading" className="mt-1 text-lg font-semibold">Recent Transactions</h2></div>
      <button type="button" onClick={onViewAll} aria-label="View all EdenOS records" className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">View all <ArrowRight size={14} /></button>
    </div>
    {recent.length === 0 ? <div className="m-5 flex min-h-48 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-center"><ReceiptText size={20} className="text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">No transactions in {monthLabel}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Add confirmed income or spending to begin.</p></div> : <div className="divide-y divide-[var(--border-subtle)]">{recent.map((transaction) => <TransactionRow key={`${transaction.direction}-${transaction.id}`} transaction={transaction} onSelect={onSelect} />)}</div>}
  </section>
}

function TransactionRow({ transaction, onSelect }: { transaction: FinanceTransaction; onSelect: (transaction: FinanceTransaction) => void }) {
  const income = transaction.direction === 'income'
  return <button type="button" onClick={() => onSelect(transaction)} className="grid min-h-[4.35rem] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-[var(--focus)]">
    <span className={`grid size-9 place-items-center rounded-xl ${income ? 'bg-[var(--positive-wash)] text-[var(--positive)]' : 'bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]'}`}>{income ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
    <span className="min-w-0"><strong className="block truncate text-sm">{transaction.description}</strong><span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{transaction.category} · {formatLongDate(transaction.date)}</span></span>
    <FinancialAmount amountSen={transaction.amountSen} prefix={income ? '+' : '-'} interactive={false} className={`text-sm font-semibold ${income ? 'text-[var(--positive)]' : 'text-[var(--text-primary)]'}`} />
  </button>
}

export function GoalBudgetSummary({ summary }: { summary: FinanceSummary['budgetPlan'] }) {
  const planning = useFinancePlanning()
  const activeGoals = planning.goals.filter((goal) => goal.status === 'active').slice(0, 2)
  const activeBudgets = summary.active.slice(0, 2)
  return <section className="dashboard-card p-5" aria-labelledby="goal-budget-summary-heading">
    <div className="flex items-start justify-between gap-3"><div><p className="section-label">Plan health</p><h2 id="goal-budget-summary-heading" className="mt-1 text-lg font-semibold">Goals &amp; Budgets</h2></div><a href="#finance-planning-management" className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-[var(--accent-soft)] outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]">Manage <ArrowRight size={14} /></a></div>
    {planning.status === 'loading' ? <p className="mt-5 text-sm text-[var(--text-muted)]">Loading your plans…</p> : planning.status === 'error' ? <p role="alert" className="mt-5 rounded-xl bg-[var(--danger-wash)] p-3 text-sm">Planning is temporarily unavailable.</p> : <>
      <div className="mt-5"><div className="flex items-center gap-2"><Target size={15} className="text-[var(--accent-soft)]" /><h3 className="text-sm font-semibold">Active goals</h3></div>{activeGoals.length ? <div className="mt-3 space-y-3">{activeGoals.map((goal) => { const progress = goalProgress(goal); return <div key={goal.id}><div className="flex items-baseline justify-between gap-3 text-xs"><span className="truncate font-semibold">{goal.name}</span><span className="shrink-0 text-[var(--text-muted)]"><FinancialAmount amountSen={goal.allocatedAmountSen} interactive={false} /> / <FinancialAmount amountSen={goal.targetAmountSen} interactive={false} /></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-right text-[0.68rem] text-[var(--text-muted)]">{Math.round(progress)}%</p></div> })}</div> : <p className="mt-3 text-xs text-[var(--text-muted)]">No active goals. Add one when you have something specific to fund.</p>}</div>
      <div className="mt-5 border-t border-[var(--border-subtle)] pt-4"><div className="flex items-center gap-2"><WalletCards size={15} className="text-[var(--accent-blue)]" /><h3 className="text-sm font-semibold">Monthly budgets</h3></div><OverallBudget summary={summary} />{activeBudgets.length ? <div className="mt-3 space-y-3">{activeBudgets.map((item) => <BudgetLine key={item.budget.id} budget={item.budget} spentSen={item.spentSen} remainingSen={item.remainingSen} overspentSen={item.overspentSen} />)}</div> : <p className="mt-3 text-xs text-[var(--text-muted)]">No budget pots. An overall limit can still stand alone.</p>}</div>
    </>}
  </section>
}

function OverallBudget({ summary }: { summary: FinanceSummary['budgetPlan'] }) {
  if (summary.totalBudgetSen === null) return null
  return <div className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold">Overall budget</span><span><FinancialAmount amountSen={summary.spentSen} interactive={false} /> / <FinancialAmount amountSen={summary.totalBudgetSen} interactive={false} /></span></div><p data-testid="overall-budget-status" className={`mt-1 text-xs ${summary.isOverspent ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}><FinancialAmount amountSen={summary.remainingSen ?? 0} interactive={false} /> remaining{summary.unallocatedBudgetSen !== null ? <> · <FinancialAmount amountSen={summary.unallocatedBudgetSen} interactive={false} /> unallocated</> : null}</p></div>
}

function BudgetLine({ budget, spentSen, remainingSen, overspentSen }: { budget: FinanceBudget; spentSen: number | null; remainingSen: number | null; overspentSen: number }) {
  const percent = spentSen === null ? 0 : Math.min(100, spentSen / budget.monthlyAmountSen * 100)
  const overspent = remainingSen !== null && remainingSen < 0
  return <div><div className="flex items-baseline justify-between gap-3 text-xs"><span className="truncate font-semibold">{budget.name}</span><span className="shrink-0 text-[var(--text-muted)]">{spentSen === null ? 'Planning only' : <><FinancialAmount amountSen={spentSen} interactive={false} /> / <FinancialAmount amountSen={budget.monthlyAmountSen} interactive={false} /></>}</span></div>{spentSen !== null && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]"><div className={`h-full rounded-full ${overspent ? 'bg-[var(--warning)]' : 'bg-[var(--accent-blue)]'}`} style={{ width: `${percent}%` }} /></div><p data-testid={`budget-status-${budget.id}`} className={`mt-1 text-right text-[0.68rem] ${overspent ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>{overspent ? <><FinancialAmount amountSen={overspentSen} interactive={false} /> overspent</> : <><FinancialAmount amountSen={remainingSen ?? 0} interactive={false} /> remaining</>}</p></>}</div>
}
