import { Target } from 'lucide-react'

export function SavingsGoalCard() {
  return (
    <section aria-label="Savings goal" className="dashboard-card order-1 col-span-2 min-h-70 p-6 sm:p-7 md:col-span-3 xl:col-span-7 xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Savings Goal</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Personal savings progress</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
          <Target aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-9 sm:mt-10">
        <p className="metric-value text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-none">
          Not configured
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">No savings goal is currently set.</p>
      </div>

      <div className="mt-8 border-t border-[var(--border-subtle)] pt-5">
        <p className="text-sm text-[var(--text-secondary)]">
          Savings values will appear only when a real goal is configured.
        </p>
      </div>
    </section>
  )
}
