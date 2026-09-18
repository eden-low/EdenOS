import { Target } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import { useUserSettings } from '../../state/useUserSettings'
import { MoneySettingsDialog } from './MoneySettingsDialog'

export function SavingsGoalCard() {
  const { settings, status } = useUserSettings()
  return (
    <section aria-label="Savings goal" className="dashboard-card order-6 col-span-2 p-5 sm:p-6 md:col-span-6 xl:col-span-12">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
          <Target aria-hidden="true" size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="section-label">Savings Goal</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {status === 'loading' ? 'Loading savings goal…' : status === 'error' ? 'Savings goal unavailable.' :
                settings.savingsGoalSen === null ? 'No savings goal is currently set.' : 'Target amount to save.'}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-0">
            <p className="break-all text-sm font-semibold text-[var(--text-primary)]">
              {status === 'loaded' && settings.savingsGoalSen !== null ? formatMoney(settings.savingsGoalSen) : status === 'loaded' ? 'Not configured' : '—'}
            </p>
            {status === 'loaded' && <MoneySettingsDialog kind="savings" />}
          </div>
        </div>
      </div>
    </section>
  )
}
