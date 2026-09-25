import { TrendingDown, TrendingUp } from 'lucide-react'
import type { FinanceSummary } from '../../selectors/financeSelectors'
import { FinancialAmount } from '../privacy/FinancialAmount'

export function MonthStory({ summary }: { summary: FinanceSummary }) {
  return <section className="dashboard-card mt-4 p-5 sm:p-6" aria-labelledby="month-story-heading">
    <p className="section-label">Month story</p><h2 id="month-story-heading" className="mt-1 text-lg font-semibold">{summary.monthLabel} at a glance</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Story label="Net cashflow" value={<FinancialAmount amountSen={summary.netCashflowSen} />} detail="Income minus actual expenses" />
      <Story label="Goal allocations" value={<FinancialAmount amountSen={summary.goalAllocationsSen} />} detail="Reserved this month, not an expense" />
      <Story label="Available" value={<FinancialAmount amountSen={summary.availableSen} />} detail="Income minus spending and goal allocations" attention={summary.availableSen < 0} />
      <Story label="Spending change" value={summary.expenseChangePercent === null ? 'No prior baseline' : `${summary.expenseChangePercent >= 0 ? '+' : ''}${Math.round(summary.expenseChangePercent)}%`} detail={summary.expenseChangePercent !== null && summary.expenseChangePercent > 0 ? <><TrendingUp className="mr-1 inline" size={14} />Higher than last month</> : <><TrendingDown className="mr-1 inline" size={14} />Not above last month</>} />
      <Story label={summary.isOverspent ? 'Budget attention' : 'Budget remaining'} value={summary.budgetRemainingSen === null ? 'Not configured' : <FinancialAmount amountSen={summary.budgetRemainingSen} />} detail={summary.isOverspent ? 'Spending is above the monthly budget.' : 'Signed remaining amount'} attention={summary.isOverspent} />
    </div>
    {summary.mostChangedCategory && summary.hasPreviousData && <p className="mt-4 text-sm text-[var(--text-secondary)]">Most changed: <strong>{summary.mostChangedCategory.label}</strong> by <FinancialAmount amountSen={summary.mostChangedCategory.changeSen} prefix={summary.mostChangedCategory.changeSen > 0 ? '+' : ''} interactive={false} /> versus last month.</p>}
  </section>
}

function Story({ label, value, detail, attention = false }: { label: string; value: React.ReactNode; detail: React.ReactNode; attention?: boolean }) {
  return <article className={`rounded-2xl border p-4 ${attention ? 'border-[var(--warning-border)] bg-[var(--warning-wash)]' : 'border-[var(--border-subtle)] bg-[var(--surface-secondary)]'}`}><p className="section-label">{label}</p><div className="mt-2 text-lg font-semibold">{value}</div><div className="mt-1 text-xs text-[var(--text-muted)]">{detail}</div></article>
}
