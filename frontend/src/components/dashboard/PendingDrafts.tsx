import { FileClock } from 'lucide-react'

export function PendingDrafts({ count }: { count: number }) {
  return (
    <section aria-label="Pending drafts" className="dashboard-card order-6 col-span-2 self-stretch bg-[var(--surface-elevated)] p-5 sm:p-6 md:order-4 md:col-span-3 xl:order-5 xl:col-span-4">
      <div className="flex h-full min-h-28 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-amber-wash)] text-[var(--accent-amber)]">
          <FileClock aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="section-label text-[var(--accent-amber)]">Pending</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text-primary)] sm:text-base">
            {count === 0
              ? 'No records need confirmation'
              : `${count} ${count === 1 ? 'record needs' : 'records need'} confirmation`}
          </p>
        </div>
      </div>
    </section>
  )
}
