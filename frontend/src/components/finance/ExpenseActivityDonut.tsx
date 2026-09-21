import { Layers3 } from 'lucide-react'
import type { FinanceSummary } from '../../selectors/financeSelectors'
import { FinancialAmount } from '../privacy/FinancialAmount'

const colors = ['var(--accent-blue)', 'var(--accent-teal)', 'var(--accent-primary)', 'var(--warning)', 'var(--positive)', 'var(--text-muted)']

export function ExpenseActivityDonut({ summary }: { summary: FinanceSummary }) {
  const segments = summary.categories.map((item, index, categories) => ({
    ...item,
    offset: categories.slice(0, index).reduce((sum, category) => sum + category.percentage, 0),
  }))
  return <section className="dashboard-card p-5 sm:p-6" aria-labelledby="activity-title">
    <p className="section-label">Expense activity</p><h2 id="activity-title" className="mt-1 text-lg font-semibold">Category breakdown</h2>
    {summary.categories.length === 0 ? <div className="mt-4 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] text-center"><Layers3 size={20} className="text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">No expenses in {summary.monthLabel}</p><p className="mt-1 text-xs text-[var(--text-muted)]">Income is intentionally excluded.</p></div> : <div className="mt-5 grid items-center gap-5 sm:grid-cols-[10rem_1fr] lg:grid-cols-1 xl:grid-cols-[10rem_1fr]">
      <div className="relative mx-auto size-40" role="img" aria-label={`Expense categories for ${summary.monthLabel}`}>
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-secondary)" strokeWidth="14" />
          {segments.map((item, index) => <circle key={item.category} cx="60" cy="60" r="46" fill="none" stroke={colors[index % colors.length]} strokeWidth="14" pathLength="100" strokeDasharray={`${item.percentage} ${100 - item.percentage}`} strokeDashoffset={-item.offset} />)}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center"><span className="text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">Expenses</span><FinancialAmount amountSen={summary.monthlyExpensesSen} className="mt-1 text-sm font-semibold" interactive={false} /></div>
      </div>
      <ul className="space-y-3">{summary.categories.slice(0, 6).map((item, index) => <li key={item.category} className="flex items-center gap-2 text-sm"><i className="size-2.5 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{item.label}</span><span className="font-semibold">{Math.round(item.percentage)}%</span></li>)}</ul>
    </div>}
  </section>
}
