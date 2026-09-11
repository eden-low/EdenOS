import { formatLongDate, formatTime } from '../../lib/date'
import { formatDistance, formatDuration } from '../../lib/format'
import type { ExerciseDraft } from '../../types/records'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function ReviewExercise({
  draft,
  onEdit,
  onConfirm,
  isConfirming,
  error,
}: {
  draft: ExerciseDraft
  onEdit: () => void
  onConfirm: () => Promise<void>
  isConfirming: boolean
  error: string | null
}) {
  return (
    <div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
        <p className="section-label">Exercise draft</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{draft.data.activity}</h3>

        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--border-subtle)] pt-5 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Duration</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatDuration(draft.data.durationSeconds)}
            </dd>
          </div>
          {draft.data.distanceMetres !== undefined && (
            <div>
              <dt className="text-[var(--text-muted)]">Distance</dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {formatDistance(draft.data.distanceMetres)}
              </dd>
            </div>
          )}
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
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        Confirmed exercise becomes a trusted record and updates Today.
      </p>

      {error && <InlineError message={error} />}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onEdit} disabled={isConfirming}>Edit</Button>
        <Button type="button" onClick={() => void onConfirm()} disabled={isConfirming}>
          {isConfirming ? 'Confirming…' : 'Confirm exercise'}
        </Button>
      </div>
    </div>
  )
}
