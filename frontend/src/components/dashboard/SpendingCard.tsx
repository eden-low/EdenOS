import { ArrowDownLeft, ArrowUpRight, Gauge, Landmark } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MonthlySpendingSummary } from '../../types/dashboard'
import type { RecordDomainStatus } from '../../types/records'
import { useUserSettings } from '../../state/useUserSettings'
import { FinancialAmount } from '../privacy/FinancialAmount'
import { Button } from '../ui/button'
import { MoneySettingsDialog } from './MoneySettingsDialog'

interface SpendingCardProps {
  spending: MonthlySpendingSummary
  finance: { incomeSen: number; expenseSen: number; netCashflowSen: number }
  status: RecordDomainStatus
  incomeStatus: RecordDomainStatus
  error: string | null
  incomeError: string | null
  onRetry: () => void
  onRetryIncome: () => void
  onOpen?: () => void
}

export function SpendingCard({ spending, finance, status, incomeStatus, error, incomeError, onRetry, onRetryIncome, onOpen }: SpendingCardProps) {
  const { settings, status: settingsStatus } = useUserSettings()
  const loaded = status === 'loaded' && incomeStatus === 'loaded'
  const remainingSen = settings.monthlyBudgetSen === null ? null : settings.monthlyBudgetSen - finance.expenseSen
  return <section aria-label={`${spending.month} finance overview`} className="dashboard-card bg-[var(--surface-secondary)] p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="section-label">Finance Overview</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{spending.month} cashflow</p></div><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]"><Landmark size={20} /></span></div>
    {loaded ? <div className="mt-5 grid grid-cols-2 gap-3">
      <MiniMetric icon={<ArrowDownLeft size={15} />} label="Income" amount={finance.incomeSen} positive />
      <MiniMetric icon={<ArrowUpRight size={15} />} label="Expenses" amount={finance.expenseSen} />
      <MiniMetric icon={<Landmark size={15} />} label="Net Cashflow" amount={finance.netCashflowSen} positive={finance.netCashflowSen >= 0} />
      <MiniMetric icon={<Gauge size={15} />} label="Budget remaining" amount={remainingSen} />
    </div> : <div role={status === 'error' || incomeStatus === 'error' ? 'alert' : 'status'} className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"><p className="text-sm font-semibold">{status === 'loading' || incomeStatus === 'loading' ? 'Loading finance…' : 'Finance unavailable'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{error ?? incomeError ?? 'Syncing income and expense records.'}</p>{status === 'error' && <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry expenses</Button>}{incomeStatus === 'error' && <Button variant="secondary" className="mt-3 ml-2" onClick={onRetryIncome}>Retry income</Button>}</div>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4"><p className="text-xs text-[var(--text-muted)]">{remainingSen !== null && remainingSen < 0 ? 'Budget is overspent this month.' : 'Budget tracks expenses only. Net cashflow is not savings.'}</p><div className="flex items-center gap-2">{settingsStatus === 'loaded' && <MoneySettingsDialog kind="budget" />}{onOpen && <Button type="button" variant="ghost" onClick={onOpen}>Open Finance</Button>}</div></div>
  </section>
}

function MiniMetric({ icon, label, amount, positive = false }: { icon: ReactNode; label: string; amount: number | null; positive?: boolean }) {
  return <div className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}<span>{label}</span></div><div className={`mt-2 truncate text-base font-semibold sm:text-lg ${positive ? 'text-[var(--positive)]' : ''}`}>{amount === null ? 'Not set' : <FinancialAmount amountSen={amount} interactive={false} />}</div></div>
}
