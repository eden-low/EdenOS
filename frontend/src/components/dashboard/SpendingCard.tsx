import { Gauge, WalletCards } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import type { MonthlySpendingSummary } from '../../types/dashboard'

export function SpendingCard({ spending }: { spending: MonthlySpendingSummary }) {
  return (
    <section aria-label={`${spending.month} spending summary`} className="dashboard-card order-2 col-span-2 min-h-70 bg-[var(--surface-secondary)] p-6 sm:p-7 md:col-span-3 xl:col-span-5 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">{spending.month} Spending</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Actual spending</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]">
          <WalletCards aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-9 sm:mt-10">
        <p className="metric-value text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none">
          {formatMoney(spending.spentSen)}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">spent this month</p>
      </div>

      <div className="mt-8 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
        <Gauge aria-hidden="true" size={17} className="text-[var(--text-muted)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Budget not configured</p>
      </div>
    </section>
  )
}

export function DailySpendingCards({ spending }: { spending: MonthlySpendingSummary }) {
  return (
    <>
      <section aria-label="Today's spending" className="dashboard-card order-3 col-span-1 min-h-40 p-5 sm:p-6 md:col-span-3 xl:order-5 xl:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Today</p>
          <span className="size-2 rounded-full bg-[var(--accent-blue)]" aria-hidden="true" />
        </div>
        <p className="metric-value mt-7 text-2xl font-semibold sm:text-3xl">
          {formatMoney(spending.spentTodaySen)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">spent</p>
      </section>

      <section aria-label="Suggested spending today" className="dashboard-card order-3 col-span-1 min-h-40 bg-[var(--surface-secondary)] p-5 sm:p-6 md:col-span-3 xl:order-5 xl:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Suggested today</p>
          <span className="size-2 rounded-full bg-[var(--text-muted)]" aria-hidden="true" />
        </div>
        <p className="metric-value mt-7 text-2xl font-semibold text-[var(--text-muted)] sm:text-3xl">—</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Budget not configured</p>
      </section>
    </>
  )
}
