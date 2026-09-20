import { Gauge, WalletCards } from 'lucide-react'
import type { MonthlySpendingSummary } from '../../types/dashboard'
import type { RecordDomainStatus } from '../../types/records'
import { Button } from '../ui/button'
import { useUserSettings } from '../../state/useUserSettings'
import { MoneySettingsDialog } from './MoneySettingsDialog'
import { FinancialAmount } from '../privacy/FinancialAmount'

interface SpendingCardProps {
  spending: MonthlySpendingSummary
  status: RecordDomainStatus
  error: string | null
  onRetry: () => void
}

export function SpendingCard({ spending, status, error, onRetry }: SpendingCardProps) {
  const { settings, status: settingsStatus } = useUserSettings()
  return (
    <section aria-label={`${spending.month} spending summary`} className="dashboard-card order-1 col-span-2 bg-[var(--surface-secondary)] p-6 sm:p-7 md:col-span-6 xl:col-span-5 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">{spending.month} Spending</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Actual spending</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-blue-wash)] text-[var(--accent-blue)]">
          <WalletCards aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-7 sm:mt-8">
        {status === 'loaded' ? (
          <>
            <FinancialAmount amountSen={spending.spentSen} className="metric-value text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none" />
            <p className="mt-2 text-sm text-[var(--text-secondary)]">spent this month</p>
          </>
        ) : status === 'loading' ? (
          <div role="status">
            <p className="text-xl font-semibold text-[var(--text-primary)]">Loading spending…</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Syncing expense records.</p>
          </div>
        ) : (
          <div role="alert">
            <p className="text-xl font-semibold text-[var(--text-primary)]">Spending unavailable</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {error ?? 'Expense records are temporarily unavailable.'}
            </p>
            <Button type="button" variant="secondary" className="mt-4" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Gauge aria-hidden="true" size={17} className="shrink-0 text-[var(--text-muted)]" />
          <div className="min-w-0 break-all text-sm font-semibold text-[var(--text-primary)]">
            {settingsStatus === 'loading' ? 'Loading budget…' : settingsStatus === 'error' ? 'Budget unavailable' :
              settings.monthlyBudgetSen === null ? 'Budget not configured' : <FinancialAmount amountSen={settings.monthlyBudgetSen} prefix="Monthly budget " />}
          </div>
        </div>
        {settingsStatus === 'loaded' && <MoneySettingsDialog kind="budget" />}
      </div>
    </section>
  )
}

export function DailySpendingCards({
  spending,
  status,
}: Pick<SpendingCardProps, 'spending' | 'status'>) {
  const { settings, status: settingsStatus } = useUserSettings()
  const remainingSen = settings.monthlyBudgetSen === null ? null : settings.monthlyBudgetSen - spending.spentSen
  return (
    <>
      <section aria-label="Today's spending" className="dashboard-card order-3 col-span-1 p-5 sm:p-6 md:col-span-3 xl:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Today</p>
          <span className="size-2 rounded-full bg-[var(--accent-blue)]" aria-hidden="true" />
        </div>
        {status === 'loaded' ? (
          <>
            <FinancialAmount amountSen={spending.spentTodaySen} className="metric-value mt-6 text-2xl font-semibold sm:text-3xl" />
            <p className="mt-1 text-sm text-[var(--text-secondary)]">spent</p>
          </>
        ) : (
          <>
            <p className="mt-6 text-lg font-semibold text-[var(--text-primary)]">
              {status === 'loading' ? 'Loading…' : 'Unavailable'}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {status === 'loading' ? 'Syncing expenses' : 'Expense data could not be loaded'}
            </p>
          </>
        )}
      </section>

      <section aria-label="Monthly budget remaining" className="dashboard-card order-4 col-span-1 bg-[var(--surface-secondary)] p-5 sm:p-6 md:col-span-3 xl:order-5 xl:col-span-4">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Monthly remaining</p>
          <span className="size-2 rounded-full bg-[var(--text-muted)]" aria-hidden="true" />
        </div>
        <div className="metric-value mt-6 break-all text-[clamp(1rem,5vw,1.5rem)] font-semibold sm:text-3xl">
          {status === 'loaded' && settingsStatus === 'loaded' && remainingSen !== null ? <FinancialAmount amountSen={remainingSen} /> : '—'}
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {settingsStatus === 'loading' ? 'Loading budget' : settingsStatus === 'error' ? 'Budget unavailable' :
            remainingSen === null ? 'Budget not configured' : status !== 'loaded' ? 'Spending unavailable' :
              remainingSen < 0 ? 'over monthly budget' : 'of monthly budget'}
        </p>
      </section>
    </>
  )
}
