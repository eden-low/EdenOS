import { useEffect, useState, type FormEvent } from 'react'
import { parseExpenseText, type ExpenseTextParseFailure } from '../../domain/parseExpenseText'
import type { ExpenseData } from '../../types/records'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

const parseMessages: Record<ExpenseTextParseFailure, string> = {
  empty: 'Describe the expense and include one amount.',
  'missing-amount': 'Add one amount, like RM12.50.',
  'invalid-amount': 'Use an amount like RM12.50, with no more than two decimal places.',
  'non-positive-amount': 'Enter an amount greater than RM 0.',
  'amount-too-large': 'That amount is too large. Enter a smaller amount.',
  'missing-description': 'Add a short description, like lunch or parking.',
  ambiguous: 'Use one clear amount and a short description, or enter the expense manually.',
}

export function TextCaptureForm({
  onContinue,
  onCancel,
  onManual,
  onDirtyChange,
}: {
  onContinue: (data: ExpenseData) => void
  onCancel: () => void
  onManual: () => void
  onDirtyChange: (isDirty: boolean) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDirtyChange(text.length > 0)
  }, [onDirtyChange, text])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseExpenseText(text, new Date())
    if (!result.ok) {
      setError(parseMessages[result.reason])
      return
    }

    setError(null)
    onContinue(result.data)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="expense-text" className="form-label">What did you spend?</label>
      <textarea
        id="expense-text"
        name="expense-text"
        rows={4}
        autoFocus
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError(null)
        }}
        placeholder="lunch RM12.50 yesterday"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'expense-text-error' : 'expense-text-example'}
        className="form-control resize-none"
      />
      <p id="expense-text-example" className="mt-2 text-sm text-[var(--text-muted)]">
        Try: lunch RM12.50 yesterday
      </p>

      {error && <div id="expense-text-error"><InlineError message={error} /></div>}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Back</Button>
        <Button type="button" variant="secondary" onClick={onManual}>Enter manually</Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  )
}
