import { formatLongDate, formatTime } from '../../lib/date'
import { formatDistance, formatDuration } from '../../lib/format'
import { defaultIntensity, intensityOptions, type ExerciseIntensity } from '../../domain/estimatedCalories'
import type { ExerciseData } from '../../types/records'
import { ExerciseCalories, WorkoutMetrics } from '../exercise/ExerciseCalories'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function ReviewExercise({
  data,
  onEdit,
  onConfirm,
  isConfirming,
  error,
  label = 'Exercise draft',
  helperText = 'Confirmed exercise becomes a trusted record and updates Today.',
  confirmLabel = 'Confirm exercise',
  confirmingLabel = 'Confirming…',
  onIntensityChange,
}: {
  data: ExerciseData
  onEdit: () => void
  onConfirm: () => Promise<void>
  isConfirming: boolean
  error: string | null
  label?: string
  helperText?: string
  confirmLabel?: string
  confirmingLabel?: string
  onIntensityChange?: (intensity: ExerciseIntensity) => void
}) {
  const options = intensityOptions(data.activity)
  return (
    <div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
        <p className="section-label">{label}</p>
        <h3 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{data.activity}</h3>

        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--border-subtle)] pt-5 text-sm">
          <div>
            <dt className="text-[var(--text-muted)]">Duration</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatDuration(data.durationSeconds)}
            </dd>
          </div>
          {data.distanceMetres !== undefined && (
            <div>
              <dt className="text-[var(--text-muted)]">Distance</dt>
              <dd className="mt-1 font-medium text-[var(--text-primary)]">
                {formatDistance(data.distanceMetres)}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--text-muted)]">Date</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatLongDate(data.occurredAt)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-muted)]">Time</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">
              {formatTime(data.occurredAt)}
            </dd>
          </div>
        </dl>
        {options.length > 1 && onIntensityChange && data.reportedActiveCaloriesKcal === undefined &&
          data.reportedTotalCaloriesKcal === undefined && (
          <div className="mt-5">
            <label htmlFor="exercise-intensity" className="form-label">Intensity</label>
            <select id="exercise-intensity" className="form-control" value={data.intensity ?? defaultIntensity(data.activity) ?? ''}
              onChange={(event) => onIntensityChange(event.target.value as ExerciseIntensity)} disabled={isConfirming}>
              {options.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
            </select>
            <p className="mt-2 text-xs text-[var(--text-muted)]">Default: Moderate (social play). Vigorous uses competitive play.</p>
          </div>
        )}
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          <ExerciseCalories exercise={data} />
          <WorkoutMetrics exercise={data} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
        {helperText}
      </p>

      {error && <InlineError message={error} />}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onEdit} disabled={isConfirming}>Edit</Button>
        <Button type="button" onClick={() => void onConfirm()} disabled={isConfirming}>
          {isConfirming ? confirmingLabel : confirmLabel}
        </Button>
      </div>
    </div>
  )
}
