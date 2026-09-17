import { useEffect, useState, type FormEvent } from 'react'
import { expenseCategoryOptions, isExpenseCategory } from '../../domain/expense'
import { combineLocalDateTime, toLocalDateInput, toLocalTimeInput } from '../../lib/date'
import { parseRinggitToSen } from '../../lib/format'
import type { ExpenseCategory, ExpenseData } from '../../types/records'
import type { ReceiptCandidate } from '../../types/receipt'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

interface ExpenseFormProps {
  initialData?: ExpenseData
  receiptCandidate?: ReceiptCandidate
  submitLabel: string
  onSubmit: (data: ExpenseData) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitError?: string | null
  onDirtyChange?: (isDirty: boolean) => void
}

interface FormErrors {
  amount?: string
  category?: string
  title?: string
  occurredAt?: string
}

export function ExpenseForm({
  initialData,
  receiptCandidate,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
  onDirtyChange,
}: ExpenseFormProps) {
  const [initialValues] = useState(() => {
    const initialDate = new Date(initialData?.occurredAt ?? receiptCandidate?.occurredAt ?? Date.now())
    return {
      amount: initialData?.amountSen !== undefined
        ? (initialData.amountSen / 100).toFixed(2)
        : receiptCandidate?.amountSen !== undefined
          ? (receiptCandidate.amountSen / 100).toFixed(2)
          : '',
      category: initialData?.category ?? 'food',
      title: initialData?.title ?? receiptCandidate?.title ?? '',
      date: toLocalDateInput(initialDate),
      time: toLocalTimeInput(initialDate),
      note: initialData?.note ?? '',
    }
  })
  const [amount, setAmount] = useState(initialValues.amount)
  const [category, setCategory] = useState<ExpenseCategory>(initialValues.category)
  const [title, setTitle] = useState(initialValues.title)
  const [date, setDate] = useState(initialValues.date)
  const [time, setTime] = useState(initialValues.time)
  const [note, setNote] = useState(initialValues.note)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    onDirtyChange?.(
      amount !== initialValues.amount ||
      category !== initialValues.category ||
      title !== initialValues.title ||
      date !== initialValues.date ||
      time !== initialValues.time ||
      note !== initialValues.note,
    )
  }, [
    amount,
    category,
    date,
    initialValues,
    note,
    onDirtyChange,
    time,
    title,
  ])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const amountSen = parseRinggitToSen(amount)
    const occurredAt = combineLocalDateTime(date, time)

    if (!amountSen) {
      nextErrors.amount = 'Enter an amount greater than RM 0 with no more than 2 decimal places.'
    }
    if (!isExpenseCategory(category)) nextErrors.category = 'Choose a category.'
    if (!title.trim()) nextErrors.title = 'Add a useful merchant or title.'
    if (!occurredAt) nextErrors.occurredAt = 'Choose a valid date and time.'

    setErrors(nextErrors)
    if (!amountSen || !occurredAt || Object.keys(nextErrors).length > 0) return

    onSubmit({
      amountSen,
      category,
      title: title.trim(),
      note: note.trim() || undefined,
      occurredAt,
      source: initialData?.source ?? (receiptCandidate ? 'photo' : 'manual'),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="expense-amount" className="form-label">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--accent-soft)]">
            RM
          </span>
          <input
            id="expense-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'expense-amount-error' : undefined}
            className="form-control expense-amount-control min-h-16 text-3xl font-semibold tracking-[-0.04em]"
          />
        </div>
        {errors.amount && <p id="expense-amount-error" className="form-error">{errors.amount}</p>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-category" className="form-label">Category</label>
          <select
            id="expense-category"
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            aria-invalid={Boolean(errors.category)}
            className="form-control"
          >
            {expenseCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="expense-title" className="form-label">Merchant / title</label>
          <input
            id="expense-title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Lunch"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'expense-title-error' : undefined}
            className="form-control"
          />
          {errors.title && <p id="expense-title-error" className="form-error">{errors.title}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-date" className="form-label">Date</label>
          <input
            id="expense-date"
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.occurredAt)}
            className="form-control"
          />
        </div>
        <div>
          <label htmlFor="expense-time" className="form-label">Time</label>
          <input
            id="expense-time"
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

      <div className="mt-4">
        <label htmlFor="expense-note" className="form-label">Note <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
        <textarea
          id="expense-note"
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a detail"
          className="form-control resize-none"
        />
      </div>

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
