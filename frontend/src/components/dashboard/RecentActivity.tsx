import { ReceiptText } from 'lucide-react'
import { getExerciseActivityIcon } from '../../lib/exerciseIcon'
import { formatExerciseMetrics, formatMoney } from '../../lib/format'
import type { RecentActivityItem } from '../../types/dashboard'
import { EstimatedCalories } from '../exercise/EstimatedCalories'

export function RecentActivity({
  items,
  sourceLabel = 'Finance + exercise',
  emptyMessage = 'No recent activity yet',
}: {
  items: RecentActivityItem[]
  sourceLabel?: string
  emptyMessage?: string
}) {
  return (
    <section aria-label="Recent activity" className="dashboard-card order-2 col-span-2 p-5 sm:p-6 md:col-span-6 xl:col-span-7 xl:p-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="section-label">Recent Activity</p>
        <span className="text-xs text-[var(--text-muted)]">{sourceLabel}</span>
      </div>
      <ul className="mt-4 divide-y divide-[var(--border-subtle)]">
        {items.length === 0 && (
          <li className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            {emptyMessage}
          </li>
        )}
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
                {!financeItem && <EstimatedCalories compact exercise={{ activity: item.title, durationSeconds: item.durationSeconds, intensity: item.intensity }} />}
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
