import { Target } from 'lucide-react'

export function SavingsGoalCard() {
  return (
    <section aria-label="Savings goal" className="dashboard-card order-6 col-span-2 p-5 sm:p-6 md:col-span-6 xl:col-span-12">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
          <Target aria-hidden="true" size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="section-label">Savings Goal</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">No savings goal is currently set.</p>
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--text-muted)] sm:mt-0">Not configured</p>
        </div>
      </div>
    </section>
  )
}
