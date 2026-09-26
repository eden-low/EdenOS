import { TrendingDown, TrendingUp } from 'lucide-react'
import type { FinanceSummary } from '../../selectors/financeSelectors'
import { FinancialAmount } from '../privacy/FinancialAmount'

export function MonthStory({ summary }: { summary: FinanceSummary }) {
  return <section className="dashboard-card h-full p-5" aria-labelledby="month-story-heading">
    <p className="section-label">Month story</p><h2 id="month-story-heading" className="mt-1 text-lg font-semibold">{summary.monthLabel} at a glance</h2>
    <div className="mt-5 divide-y divide-[var(--border-subtle)]">
      <Story label="Net cashflow" value={<FinancialAmount amountSen={summary.netCashflowSen} />} detail="Income minus actual expenses" />
      <Story label="Goal allocations" value={<FinancialAmount amountSen={summary.goalAllocationsSen} />} detail="Reserved this month, not an expense" />
      <Story label="Available money" value={<FinancialAmount amountSen={summary.availableSen} />} detail="Income minus spending and goal allocations" attention={summary.availableSen < 0} />
      <Story label={summary.isOverspent ? 'Budget attention' : 'Budget remaining'} value={summary.budgetRemainingSen === null ? 'Not configured' : <FinancialAmount amountSen={summary.budgetRemainingSen} />} detail={summary.isOverspent ? 'Spending is above the monthly budget.' : 'Signed remaining amount'} attention={summary.isOverspent} />
      <Story label="Spending change" value={summary.expenseChangePercent === null ? 'No prior baseline' : `${summary.expenseChangePercent >= 0 ? '+' : ''}${Math.round(summary.expenseChangePercent)}%`} detail={summary.expenseChangePercent !== null && summary.expenseChangePercent > 0 ? <><TrendingUp className="mr-1 inline" size={14} />Higher than last month</> : <><TrendingDown className="mr-1 inline" size={14} />Not above last month</>} />
    </div>
    {summary.largestCategory && <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs leading-5 text-[var(--text-secondary)]">Largest category: <strong>{summary.largestCategory.label}</strong> at <FinancialAmount amountSen={summary.largestCategory.spentSen} interactive={false} />.</p>}
    {summary.mostChangedCategory && summary.hasPreviousData && <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Most changed: <strong>{summary.mostChangedCategory.label}</strong> by <FinancialAmount amountSen={summary.mostChangedCategory.changeSen} prefix={summary.mostChangedCategory.changeSen > 0 ? '+' : ''} interactive={false} /> versus last month.</p>}
  </section>
}

function Story({ label, value, detail, attention = false }: { label: string; value: React.ReactNode; detail: React.ReactNode; attention?: boolean }) {
  return <div className={`flex items-start justify-between gap-4 py-3 first:pt-0 ${attention ? 'text-[var(--warning)]' : ''}`}><div className="min-w-0"><p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p><div className="mt-0.5 text-[0.7rem] leading-4 text-[var(--text-muted)]">{detail}</div></div><div className="shrink-0 text-sm font-semibold">{value}</div></div>
}
