import { ReceiptText } from 'lucide-react'
import { getExerciseActivityIcon } from '../../lib/exerciseIcon'
import { formatExerciseMetrics, formatMoney } from '../../lib/format'
import type { RecentActivityItem } from '../../types/dashboard'

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section aria-label="Recent activity" className="dashboard-card order-5 col-span-2 p-6 md:col-span-6 xl:order-3 xl:col-span-7 xl:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="section-label">Recent Activity</p>
        <span className="text-xs text-[var(--text-muted)]">Finance + exercise</span>
      </div>
      <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
        {items.map((item) => {
          const financeItem = item.type === 'finance'
          const Icon = financeItem ? ReceiptText : getExerciseActivityIcon(item.title)

          return (
            <li key={item.id} className="flex items-center gap-3 py-4 first:pt-2 last:pb-0">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  financeItem
                    ? 'bg-[var(--accent-wash)] text-[var(--accent-soft)]'
                    : 'bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]'
                }`}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                  {financeItem
                    ? item.category
                    : formatExerciseMetrics(item.durationSeconds, item.distanceMetres)}
                </p>
              </div>
              <div className="ml-auto shrink-0 text-right">
                {financeItem && (
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatMoney(item.amountSen)}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{item.occurredAt}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
