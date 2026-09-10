import { Target } from 'lucide-react'
import { formatMoney } from '../../lib/format'
import type { SavingsGoal } from '../../types/dashboard'

export function SavingsGoalCard({ goal }: { goal: SavingsGoal }) {
  const remainingSen = goal.targetSen - goal.allocatedSen
  const progress = Math.round((goal.allocatedSen / goal.targetSen) * 100)

  return (
    <section aria-label="Savings goal" className="dashboard-card order-1 col-span-2 min-h-70 p-6 sm:p-7 md:col-span-3 xl:col-span-7 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">{goal.name}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Allocated toward this goal</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
          <Target aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-9 sm:mt-10">
        <p className="metric-value text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none">
          {formatMoney(goal.allocatedSen)}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          of {formatMoney(goal.targetSen)}
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-[var(--accent-soft)]">{progress}% funded</span>
          <span className="text-right text-[var(--text-secondary)]">
            {formatMoney(remainingSen)} remaining
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${goal.name} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
        >
          <div
            className="h-full rounded-full bg-[var(--accent-primary)] shadow-[var(--accent-glow)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  )
}
