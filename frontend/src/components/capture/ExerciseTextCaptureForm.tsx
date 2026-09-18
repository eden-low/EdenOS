import { type FormEvent } from 'react'
import { parseExerciseText, type ExerciseTextParseResult } from '../../domain/parseExerciseText'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function ExerciseTextCaptureForm({
  text,
  onTextChange,
  onContinue,
  onCancel,
  onManual,
  error,
}: {
  text: string
  onTextChange: (text: string) => void
  onContinue: (result: ExerciseTextParseResult) => void
  onCancel: () => void
  onManual: () => void
  error: string | null
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseExerciseText(text, new Date())
    onContinue(result)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="exercise-text" className="form-label">What exercise did you do?</label>
      <textarea
        id="exercise-text"
        name="exercise-text"
        rows={4}
        autoFocus
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder="羽毛球1.5小时"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'exercise-text-error' : 'exercise-text-example'}
        className="form-control resize-none"
      />
      <p id="exercise-text-example" className="mt-2 text-sm text-[var(--text-muted)]">
        Try: 羽毛球1.5小时 or running 45min
      </p>

      {error && <div id="exercise-text-error"><InlineError message={error} /></div>}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Back</Button>
        <Button type="button" variant="secondary" onClick={onManual}>Enter manually</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  )
}
