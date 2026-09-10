import { expenseCategoryLabels } from '../../domain/expense'
import { formatLongDate, formatTime } from '../../lib/date'
import { formatMoneyExact } from '../../lib/format'
import type { ExpenseDraft } from '../../types/records'
import { Button } from '../ui/button'

export function ReviewExpense({
  draft,
  onEdit,
  onConfirm,
}: {
  draft: ExpenseDraft
  onEdit: () => void
  onConfirm: () => void
}) {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
        <p className="section-label">Expense draft</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{draft.data.title}</h3>
        <p className="metric-value mt-3 text-4xl font-semibold">
          {formatMoneyExact(draft.data.amountSen)}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--border-subtle)] pt-5 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Category</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {expenseCategoryLabels[draft.data.category]}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Source</dt>
            <dd className="mt-1 font-medium capitalize text-[var(--text-primary)]">{draft.data.source}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Date</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatLongDate(draft.data.occurredAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Time</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatTime(draft.data.occurredAt)}
            </dd>
          </div>
        </dl>

        {draft.data.note && (
          <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
            <p className="text-sm text-[var(--text-muted)]">Note</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{draft.data.note}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        Confirmed expenses become trusted records and update Today.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button type="button" onClick={onConfirm}>Confirm expense</Button>
      </div>
    </div>
  )
}
