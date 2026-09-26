import { ArrowDownLeft, ArrowUpRight, Gauge, Landmark } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MonthlySpendingSummary } from '../../types/dashboard'
import type { RecordDomainStatus } from '../../types/records'
import { useUserSettings } from '../../state/useUserSettings'
import { FinancialAmount } from '../privacy/FinancialAmount'
import { Button } from '../ui/button'
import { MoneySettingsDialog } from './MoneySettingsDialog'
import type { FinanceGoal, FinanceGoalAllocation } from '../../types/finance'
import { goalProgress, sumGoalAllocations } from '../../domain/financePlanning'

interface SpendingCardProps {
  spending: MonthlySpendingSummary
  finance: { incomeSen: number; expenseSen: number; netCashflowSen: number }
  goals: FinanceGoal[]
  goalAllocations: FinanceGoalAllocation[]
  planningStatus: 'loading' | 'loaded' | 'error'
  status: RecordDomainStatus
  incomeStatus: RecordDomainStatus
  error: string | null
  incomeError: string | null
  onRetry: () => void
  onRetryIncome: () => void
  onOpen?: () => void
}

export function SpendingCard({ spending, finance, goals, goalAllocations, planningStatus, status, incomeStatus, error, incomeError, onRetry, onRetryIncome, onOpen }: SpendingCardProps) {
  const { settings, status: settingsStatus } = useUserSettings()
  const loaded = status === 'loaded' && incomeStatus === 'loaded'
  const remainingSen = settings.monthlyBudgetSen === null ? null : settings.monthlyBudgetSen - finance.expenseSen
  const activeGoals = goals.filter((goal) => goal.status === 'active')
  const totalSavedSen = activeGoals.reduce((sum, goal) => sum + goal.allocatedAmountSen, 0)
  const allocationsSen = sumGoalAllocations(goalAllocations)
  const availableSen = finance.netCashflowSen - allocationsSen
  return <section aria-label={`${spending.month} finance overview`} className="dashboard-card bg-[var(--surface-secondary)] p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="section-label">Finance Overview</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{spending.month} cashflow</p></div><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]"><Landmark size={20} /></span></div>
    {loaded ? <div className="mt-5 grid grid-cols-2 gap-3">
      <MiniMetric icon={<ArrowDownLeft size={15} />} label="Income" amount={finance.incomeSen} positive />
      <MiniMetric icon={<ArrowUpRight size={15} />} label="Expenses" amount={finance.expenseSen} />
      <MiniMetric icon={<Landmark size={15} />} label="Goal allocations" amount={planningStatus === 'loaded' ? allocationsSen : null} positive />
      <MiniMetric icon={<Gauge size={15} />} label="Available" amount={planningStatus === 'loaded' ? availableSen : null} positive={availableSen >= 0} />
    </div> : <div role={status === 'error' || incomeStatus === 'error' ? 'alert' : 'status'} className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"><p className="text-sm font-semibold">{status === 'loading' || incomeStatus === 'loading' ? 'Loading finance…' : 'Finance unavailable'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{error ?? incomeError ?? 'Syncing income and expense records.'}</p>{status === 'error' && <Button variant="secondary" className="mt-3" onClick={onRetry}>Retry expenses</Button>}{incomeStatus === 'error' && <Button variant="secondary" className="mt-3 ml-2" onClick={onRetryIncome}>Retry income</Button>}</div>}
    <div className="mt-4 space-y-1 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-muted)]"><p><strong className="text-[var(--text-secondary)]">Budget:</strong> {remainingSen === null ? 'No overall limit' : <><FinancialAmount amountSen={finance.expenseSen} interactive={false} /> spent of <FinancialAmount amountSen={settings.monthlyBudgetSen ?? 0} interactive={false} /> · <FinancialAmount amountSen={remainingSen} interactive={false} /> remaining</>}</p><p><strong className="text-[var(--text-secondary)]">Goals:</strong> {planningStatus === 'loading' ? 'Loading…' : activeGoals.length === 0 ? 'No active goals' : <><FinancialAmount amountSen={totalSavedSen} interactive={false} /> saved across {activeGoals.length} active {activeGoals.length === 1 ? 'goal' : 'goals'}{activeGoals[0] ? ` · ${activeGoals[0].name} ${Math.round(goalProgress(activeGoals[0]))}%` : ''}</>}</p>{remainingSen !== null && remainingSen < 0 && <p className="text-[var(--warning)]">Budget is overspent this month.</p>}</div>
    <div className="mt-4 flex flex-wrap justify-end gap-2">{settingsStatus === 'loaded' && <MoneySettingsDialog kind="budget" />}{onOpen && <Button type="button" variant="ghost" onClick={onOpen}>Open Finance</Button>}</div>
  </section>
}

function MiniMetric({ icon, label, amount, positive = false }: { icon: ReactNode; label: string; amount: number | null; positive?: boolean }) {
  return <div className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">{icon}<span>{label}</span></div><div className={`mt-2 truncate text-base font-semibold sm:text-lg ${positive ? 'text-[var(--positive)]' : ''}`}>{amount === null ? 'Not set' : <FinancialAmount amountSen={amount} interactive={false} />}</div></div>
}
