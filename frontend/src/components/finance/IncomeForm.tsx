import { useState, type FormEvent } from 'react'
import { incomeCategoryOptions, isIncomeCategory } from '../../domain/income'
import { combineLocalDateTime, toLocalDateInput, toLocalTimeInput } from '../../lib/date'
import { parseRinggitToSen } from '../../lib/format'
import type { IncomeCategory, IncomeData } from '../../types/records'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

export function IncomeForm({
  initialData,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}: {
  initialData?: IncomeData
  submitLabel: string
  onSubmit: (data: IncomeData) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitError?: string | null
}) {
  const [initialDate] = useState(() => new Date(initialData?.occurredAt ?? Date.now()))
  const [amount, setAmount] = useState(initialData ? (initialData.amountSen / 100).toFixed(2) : '')
  const [category, setCategory] = useState<IncomeCategory>(initialData?.category ?? 'salary')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [date, setDate] = useState(toLocalDateInput(initialDate))
  const [time, setTime] = useState(toLocalTimeInput(initialDate))
  const [note, setNote] = useState(initialData?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountSen = parseRinggitToSen(amount)
    const occurredAt = combineLocalDateTime(date, time)
    const nextErrors: Record<string, string> = {}
    if (!amountSen) nextErrors.amount = 'Enter an amount greater than RM 0 with no more than 2 decimal places.'
    if (!isIncomeCategory(category)) nextErrors.category = 'Choose a category.'
    if (!description.trim()) nextErrors.description = 'Add a useful source or description.'
    if (!occurredAt) nextErrors.occurredAt = 'Choose a valid date and time.'
    setErrors(nextErrors)
    if (!amountSen || !occurredAt || Object.keys(nextErrors).length) return
    onSubmit({
      amountSen,
      category,
      description: description.trim(),
      note: note.trim() || undefined,
      occurredAt,
    })
  }

  return <form onSubmit={handleSubmit} noValidate>
    <div>
      <label htmlFor="income-amount" className="form-label">Amount</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[var(--positive)]">RM</span>
        <input id="income-amount" type="text" inputMode="decimal" autoComplete="off" autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.amount)} className="form-control expense-amount-control min-h-16 text-3xl font-semibold tracking-[-0.04em]" />
      </div>
      {errors.amount && <p className="form-error">{errors.amount}</p>}
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="income-category" className="form-label">Category</label>
        <select id="income-category" value={category} onChange={(event) => setCategory(event.target.value as IncomeCategory)} className="form-control">
          {incomeCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="income-description" className="form-label">Source / description</label>
        <input id="income-description" maxLength={120} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Monthly salary" aria-invalid={Boolean(errors.description)} className="form-control" />
        {errors.description && <p className="form-error">{errors.description}</p>}
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div><label htmlFor="income-date" className="form-label">Date</label><input id="income-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.occurredAt)} className="form-control" /></div>
      <div><label htmlFor="income-time" className="form-label">Time</label><input id="income-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-invalid={Boolean(errors.occurredAt)} className="form-control" /></div>
    </div>
    {errors.occurredAt && <p className="form-error">{errors.occurredAt}</p>}
    <div className="mt-4"><label htmlFor="income-note" className="form-label">Note <span className="font-normal text-[var(--text-muted)]">(optional)</span></label><textarea id="income-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a detail" className="form-control resize-none" /></div>
    {submitError && <InlineError message={submitError} />}
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : submitLabel}</Button>
    </div>
  </form>
}
