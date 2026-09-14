import { useEffect, useState, type FormEvent } from 'react'
import { combineLocalDateTime, toLocalDateInput, toLocalTimeInput } from '../../lib/date'
import type { ExerciseData } from '../../types/records'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

interface ExerciseFormProps {
  initialData?: ExerciseData
  submitLabel: string
  onSubmit: (data: ExerciseData) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitError?: string | null
  onDirtyChange?: (isDirty: boolean) => void
}

interface FormErrors {
  activity?: string
  duration?: string
  distance?: string
  occurredAt?: string
}

function parsePositiveWholeNumber(value: string): number | null {
  const normalized = value.trim()
  if (!/^[1-9]\d*$/.test(normalized)) return null

  const number = Number(normalized)
  return Number.isSafeInteger(number) ? number : null
}

export function ExerciseForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
  onDirtyChange,
}: ExerciseFormProps) {
  const [initialValues] = useState(() => {
    const initialDate = initialData ? new Date(initialData.occurredAt) : new Date()
    return {
      activity: initialData?.activity ?? '',
      duration: initialData ? String(Math.round(initialData.durationSeconds / 60)) : '',
      distance: initialData?.distanceMetres === undefined
        ? ''
        : String(initialData.distanceMetres),
      date: toLocalDateInput(initialDate),
      time: toLocalTimeInput(initialDate),
    }
  })
  const [activity, setActivity] = useState(initialValues.activity)
  const [duration, setDuration] = useState(initialValues.duration)
  const [distance, setDistance] = useState(initialValues.distance)
  const [date, setDate] = useState(initialValues.date)
  const [time, setTime] = useState(initialValues.time)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    onDirtyChange?.(
      activity !== initialValues.activity ||
      duration !== initialValues.duration ||
      distance !== initialValues.distance ||
      date !== initialValues.date ||
      time !== initialValues.time,
    )
  }, [
    activity,
    date,
    distance,
    duration,
    initialValues,
    onDirtyChange,
    time,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const trimmedActivity = activity.trim()
    const wholeMinutes = parsePositiveWholeNumber(duration)
    const durationSeconds =
      wholeMinutes !== null && wholeMinutes <= Math.floor(Number.MAX_SAFE_INTEGER / 60)
        ? wholeMinutes * 60
        : null
    const hasDistance = distance.trim().length > 0
    const distanceMetres = hasDistance ? parsePositiveWholeNumber(distance) : undefined
    const occurredAt = combineLocalDateTime(date, time)

    if (!trimmedActivity) nextErrors.activity = 'Add an activity.'
    if (trimmedActivity.length > 80) nextErrors.activity = 'Keep the activity to 80 characters or fewer.'
    if (!durationSeconds) nextErrors.duration = 'Enter a whole number of minutes greater than 0.'
    if (hasDistance && !distanceMetres) {
      nextErrors.distance = 'Enter a whole number of metres greater than 0, or leave it blank.'
    }
    if (!occurredAt) nextErrors.occurredAt = 'Choose a valid date and time.'

    setErrors(nextErrors)
    if (!durationSeconds || (hasDistance && !distanceMetres) || !occurredAt || Object.keys(nextErrors).length > 0) {
      return
    }

    onSubmit({
      activity: trimmedActivity,
      ...(typeof distanceMetres === 'number' ? { distanceMetres } : {}),
      durationSeconds,
      occurredAt,
      source: 'manual',
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="exercise-activity" className="form-label">Activity</label>
        <input
          id="exercise-activity"
          name="activity"
          type="text"
          autoComplete="off"
          autoFocus
          maxLength={80}
          value={activity}
          onChange={(event) => setActivity(event.target.value)}
          placeholder="Evening walk"
          aria-invalid={Boolean(errors.activity)}
          aria-describedby={errors.activity ? 'exercise-activity-error' : undefined}
          className="form-control"
        />
        {errors.activity && <p id="exercise-activity-error" className="form-error">{errors.activity}</p>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="exercise-duration" className="form-label">Duration (minutes)</label>
          <input
            id="exercise-duration"
            name="duration"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="30"
            aria-invalid={Boolean(errors.duration)}
            aria-describedby={errors.duration ? 'exercise-duration-error' : undefined}
            className="form-control"
          />
          {errors.duration && <p id="exercise-duration-error" className="form-error">{errors.duration}</p>}
        </div>

        <div>
          <label htmlFor="exercise-distance" className="form-label">
            Distance (metres) <span className="font-normal text-[var(--text-muted)]">(optional)</span>
          </label>
          <input
            id="exercise-distance"
            name="distance"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
            placeholder="2400"
            aria-invalid={Boolean(errors.distance)}
            aria-describedby={errors.distance ? 'exercise-distance-error' : undefined}
            className="form-control"
          />
          {errors.distance && <p id="exercise-distance-error" className="form-error">{errors.distance}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="exercise-date" className="form-label">Date</label>
          <input
            id="exercise-date"
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.occurredAt)}
            className="form-control"
          />
        </div>
        <div>
          <label htmlFor="exercise-time" className="form-label">Time</label>
          <input
            id="exercise-time"
            name="time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-invalid={Boolean(errors.occurredAt)}
            className="form-control"
          />
        </div>
      </div>
      {errors.occurredAt && <p className="form-error">{errors.occurredAt}</p>}

      {submitError && <InlineError message={submitError} />}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Back</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
