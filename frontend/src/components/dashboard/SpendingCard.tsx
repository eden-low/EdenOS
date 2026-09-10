import { Gauge, WalletCards } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import type { MonthlyBudgetSummary } from '../../types/dashboard'

export function SpendingCard({ budget }: { budget: MonthlyBudgetSummary }) {
  const remainingSen = budget.budgetSen - budget.spentSen
  const overBudget = remainingSen < 0

  return (
    <section aria-label={`${budget.month} spending summary`} className="dashboard-card order-2 col-span-2 min-h-70 bg-[var(--surface-secondary)] p-6 sm:p-7 md:col-span-3 xl:col-span-5 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">{budget.month} Spending</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Monthly budget</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]">
          <WalletCards aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-9 sm:mt-10">
        <p className={`metric-value text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none ${
          overBudget ? 'text-[var(--danger)]' : ''
        }`}>
          {formatMoney(remainingSen)}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {overBudget ? 'over budget' : 'remaining this month'}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
        <Gauge aria-hidden="true" size={17} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">{formatMoney(budget.spentSen)}</span>{' '}
          spent of {formatMoney(budget.budgetSen)}
        </p>
      </div>
    </section>
  )
}

export function DailySpendingCards({ budget }: { budget: MonthlyBudgetSummary }) {
  const aboveGuidance = budget.suggestedRemainingTodaySen < 0

  return (
    <>
      <section aria-label="Today's spending" className="dashboard-card order-3 col-span-1 min-h-40 p-5 sm:p-6 md:col-span-3 xl:order-5 xl:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Today</p>
          <span className="size-2 rounded-full bg-[var(--accent-blue)]" aria-hidden="true" />
        </div>
        <p className="metric-value mt-7 text-2xl font-semibold sm:text-3xl">
          {formatMoney(budget.spentTodaySen)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">spent</p>
      </section>

      <section aria-label="Suggested spending today" className="dashboard-card order-3 col-span-1 min-h-40 bg-[var(--surface-secondary)] p-5 sm:p-6 md:col-span-3 xl:order-5 xl:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Suggested today</p>
          <span className="size-2 rounded-full bg-[var(--accent-teal)]" aria-hidden="true" />
        </div>
        <p className={`metric-value mt-7 text-2xl font-semibold sm:text-3xl ${
          aboveGuidance ? 'text-[var(--danger)]' : ''
        }`}>
          {formatMoney(budget.suggestedRemainingTodaySen)}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {aboveGuidance ? 'above today’s guidance' : 'comfortable today'}
        </p>
      </section>
    </>
  )
}
