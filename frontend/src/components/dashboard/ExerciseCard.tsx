import { createElement } from 'react'
import { getExerciseActivityIcon } from '../../lib/exerciseIcon'
import { formatExerciseMetrics } from '../../lib/format'
import type { ExerciseSummary } from '../../types/dashboard'
import type { RecordDomainStatus } from '../../types/records'
import { Button } from '../ui/button'
import { ExerciseCalories } from '../exercise/ExerciseCalories'

interface ExerciseCardProps {
  exercise: ExerciseSummary
  status: RecordDomainStatus
  error: string | null
  onRetry: () => void
}

export function ExerciseCard({ exercise, status, error, onRetry }: ExerciseCardProps) {
  const { latestActivity } = exercise
  const ExerciseIcon = getExerciseActivityIcon(latestActivity?.name ?? '')

  return (
    <section aria-label="Weekly exercise" className="dashboard-card order-5 col-span-2 p-5 sm:p-6 md:col-span-6 xl:order-4 xl:col-span-5 xl:p-7">
      <div>
        <p className="section-label">This Week</p>
        {status === 'loaded' ? (
          <p className="metric-value mt-4 text-3xl font-semibold">
            {exercise.completedSessions}{' '}
            <span className="text-lg font-medium tracking-[-0.02em] text-[var(--text-muted)]">
              {exercise.completedSessions === 1 ? 'session' : 'sessions'} this week
            </span>
          </p>
        ) : (
          <p className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
            {status === 'loading' ? 'Loading exercise…' : 'Exercise unavailable'}
          </p>
        )}
      </div>

      <div className="mt-7 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
          {createElement(ExerciseIcon, { 'aria-hidden': true, size: 20, strokeWidth: 1.8 })}
        </span>
        {status === 'error' ? (
          <div className="min-w-0" role="alert">
            <p className="text-sm text-[var(--text-secondary)]">
              {error ?? 'Exercise records are temporarily unavailable.'}
            </p>
            <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : status === 'loading' ? (
          <div className="min-w-0" role="status">
            <p className="font-semibold text-[var(--text-primary)]">Syncing exercise records</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Your weekly activity will appear shortly.</p>
          </div>
        ) : latestActivity ? (
          <>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-[var(--text-muted)] uppercase">
                Latest activity
              </p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{latestActivity.name}</p>
              <ExerciseCalories exercise={{ activity: latestActivity.name, durationSeconds: latestActivity.durationSeconds, intensity: latestActivity.intensity,
                reportedActiveCaloriesKcal: latestActivity.reportedActiveCaloriesKcal, reportedTotalCaloriesKcal: latestActivity.reportedTotalCaloriesKcal, metricsSource: latestActivity.metricsSource }} />
            </div>
            <p className="ml-auto shrink-0 text-right text-sm font-semibold text-[var(--text-primary)]">
              {formatExerciseMetrics(latestActivity.durationSeconds, latestActivity.distanceMetres)}
            </p>
          </>
        ) : (
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">No exercise this week</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Capture a session when you’re ready.</p>
          </div>
        )}
      </div>
    </section>
  )
}
