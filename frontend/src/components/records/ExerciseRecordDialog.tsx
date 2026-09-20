import { CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { createElement, useRef, useState } from 'react'
import { ExerciseForm } from '../capture/ExerciseForm'
import { ReviewExercise } from '../capture/ReviewExercise'
import { exerciseWriteErrorMessage } from '../../lib/exerciseWriteError'
import { formatLongDate, formatTime } from '../../lib/date'
import { getExerciseActivityIcon } from '../../lib/exerciseIcon'
import { formatDistance, formatDuration } from '../../lib/format'
import { useRecords } from '../../state/useRecords'
import type { ExerciseData, ExerciseRecord } from '../../types/records'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'
import { ExerciseCalories, WorkoutMetrics } from '../exercise/ExerciseCalories'

type RecordStep = 'view' | 'edit' | 'review' | 'delete'

export function ExerciseRecordDialog({
  record,
  onClose,
}: {
  record: ExerciseRecord | undefined
  onClose: () => void
}) {
  const { updateExercise, deleteExercise } = useRecords()
  const [step, setStep] = useState<RecordStep>('view')
  const [pendingData, setPendingData] = useState<ExerciseData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const operationInFlight = useRef(false)

  function handleReview(data: ExerciseData) {
    setPendingData(data)
    setOperationError(null)
    setStep('review')
  }

  async function handleSave() {
    if (!record || !pendingData || operationInFlight.current) return

    operationInFlight.current = true
    setIsSaving(true)
    setOperationError(null)
    try {
      await updateExercise(record.id, pendingData)
      setPendingData(null)
      setStep('view')
    } catch (error) {
      setOperationError(exerciseWriteErrorMessage(error, 'update'))
    } finally {
      operationInFlight.current = false
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!record || operationInFlight.current) return

    operationInFlight.current = true
    setIsDeleting(true)
    setOperationError(null)
    try {
      await deleteExercise(record.id)
      onClose()
    } catch (error) {
      setOperationError(exerciseWriteErrorMessage(error, 'delete'))
    } finally {
      operationInFlight.current = false
      setIsDeleting(false)
    }
  }

  const exerciseIcon = record
    ? createElement(getExerciseActivityIcon(record.activity), {
        'aria-hidden': true,
        size: 20,
        strokeWidth: 1.8,
      })
    : null

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        closeDisabled={isSaving || isDeleting}
        className="sm:w-[min(38rem,calc(100vw-2rem))]"
      >
        {record && exerciseIcon && step === 'view' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Exercise record
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-[var(--text-secondary)]">
              Confirmed record details
            </DialogDescription>

            <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-teal-wash)] text-[var(--accent-teal)]">
                {exerciseIcon}
              </span>
              <p className="section-label mt-4">Exercise</p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                {record.activity}
              </h3>

              <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[var(--border-subtle)] pt-5 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Duration</dt>
                  <dd className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatDuration(record.durationSeconds)}
                  </dd>
                </div>
                {record.distanceMetres !== undefined && (
                  <div>
                    <dt className="text-[var(--text-muted)]">Distance</dt>
                    <dd className="mt-1 font-medium text-[var(--text-primary)]">
                      {formatDistance(record.distanceMetres)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-[var(--text-muted)]">Occurred</dt>
                  <dd className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatLongDate(record.occurredAt)}
                  </dd>
                  <dd className="mt-0.5 text-[var(--text-secondary)]">
                    {formatTime(record.occurredAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Created in EdenOS</dt>
                  <dd className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatLongDate(record.createdAt)}
                  </dd>
                  <dd className="mt-0.5 text-[var(--text-secondary)]">
                    {formatTime(record.createdAt)}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <ExerciseCalories exercise={record} />
                <WorkoutMetrics exercise={record} />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setOperationError(null)
                  setStep('delete')
                }}
              >
                <Trash2 aria-hidden="true" size={17} />
                Delete
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingData(null)
                  setOperationError(null)
                  setStep('edit')
                }}
              >
                <Pencil aria-hidden="true" size={17} />
                Edit exercise
              </Button>
            </div>
          </>
        )}

        {record && step === 'edit' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Edit exercise
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm text-[var(--text-secondary)]">
              Review your changes before updating this trusted record.
            </DialogDescription>
            <ExerciseForm
              initialData={pendingData ?? record}
              submitLabel="Review changes"
              onSubmit={handleReview}
              onCancel={() => {
                setOperationError(null)
                setStep(pendingData ? 'review' : 'view')
              }}
            />
          </>
        )}

        {record && pendingData && step === 'review' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Review exercise changes
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm text-[var(--text-secondary)]">
              Confirm these values before updating Firestore.
            </DialogDescription>
            <ReviewExercise
              data={pendingData}
              onIntensityChange={(intensity) => setPendingData({ ...pendingData, intensity })}
              onEdit={() => {
                setOperationError(null)
                setStep('edit')
              }}
              onConfirm={handleSave}
              isConfirming={isSaving}
              error={operationError}
              label="Updated exercise"
              helperText="Saving updates this trusted record and recalculates Today from Firestore."
              confirmLabel="Save changes"
              confirmingLabel="Saving…"
            />
          </>
        )}

        {record && step === 'delete' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Delete exercise?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              This will remove {record.activity} from your records, recent activity, and weekly exercise statistics.
            </DialogDescription>

            <div className="mt-7 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--danger-wash)] text-[var(--danger)]">
                <CalendarClock aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{record.activity}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {formatLongDate(record.occurredAt)}
                </p>
              </div>
            </div>

            {operationError && <InlineError message={operationError} />}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOperationError(null)
                  setStep('view')
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete exercise'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
