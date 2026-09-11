import { Waves } from 'lucide-react'
import { formatExerciseMetrics } from '../../lib/format'
import type { ExerciseSummary } from '../../types/dashboard'

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  const { latestActivity } = exercise

  return (
    <section aria-label="Weekly exercise" className="dashboard-card order-4 col-span-2 p-6 md:col-span-3 xl:col-span-5 xl:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">This Week</p>
          <p className="metric-value mt-4 text-3xl font-semibold">
            {exercise.completedSessions}{' '}
            <span className="text-lg font-medium tracking-[-0.02em] text-[var(--text-muted)]">
              / {exercise.targetSessions} sessions
            </span>
          </p>
        </div>
        <div className="flex gap-1.5 pt-1" aria-hidden="true">
          {Array.from({ length: exercise.targetSessions }, (_, index) => (
            <span
              key={index}
              className={`h-2 w-7 rounded-full ${
                index < exercise.completedSessions
                  ? 'bg-[var(--accent-teal)]'
                  : 'bg-[var(--surface-elevated)]'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-7 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
          <Waves aria-hidden="true" size={20} strokeWidth={1.8} />
        </span>
        {latestActivity ? (
          <>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-[var(--text-muted)] uppercase">
                Latest activity
              </p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{latestActivity.name}</p>
            </div>
            <p className="ml-auto shrink-0 text-right text-sm font-semibold text-[var(--text-primary)]">
              {formatExerciseMetrics(latestActivity.durationSeconds, latestActivity.distanceMetres)}
            </p>
          </>
        ) : (
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">No exercise recorded yet</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Capture a session when you’re ready.</p>
          </div>
        )}
      </div>
    </section>
  )
}
