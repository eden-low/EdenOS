import { CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { expenseCategoryLabels } from '../../domain/expense'
import { formatLongDate, formatTime } from '../../lib/date'
import { formatMoneyExact } from '../../lib/format'
import { expenseWriteErrorMessage } from '../../lib/expenseWriteError'
import { useRecords } from '../../state/useRecords'
import type { ExpenseData, ExpenseRecord } from '../../types/records'
import { ExpenseForm } from '../capture/ExpenseForm'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { InlineError } from '../ui/InlineError'

type RecordStep = 'view' | 'edit' | 'delete'

export function ExpenseRecordDialog({
  record,
  onClose,
}: {
  record: ExpenseRecord | undefined
  onClose: () => void
}) {
  const { updateExpense, deleteExpense } = useRecords()
  const [step, setStep] = useState<RecordStep>('view')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const operationInFlight = useRef(false)

  async function handleSave(data: ExpenseData) {
    if (!record || operationInFlight.current) return

    operationInFlight.current = true
    setIsSaving(true)
    setOperationError(null)
    try {
      await updateExpense(record.id, data)
      setStep('view')
    } catch (error) {
      setOperationError(expenseWriteErrorMessage(error, 'update'))
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
      await deleteExpense(record.id)
      onClose()
    } catch (error) {
      setOperationError(expenseWriteErrorMessage(error, 'delete'))
    } finally {
      operationInFlight.current = false
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:w-[min(38rem,calc(100vw-2rem))]">
        {record && step === 'view' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Expense record
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-[var(--text-secondary)]">
              Confirmed record details
            </DialogDescription>

            <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:p-6">
              <p className="section-label">{expenseCategoryLabels[record.category]}</p>
              <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{record.title}</h3>
              <p className="metric-value mt-3 text-4xl font-semibold">{formatMoneyExact(record.amountSen)}</p>

              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-5 text-sm">
                <div>
                  <dt className="text-[var(--text-muted)]">Occurred</dt>
                  <dd className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatLongDate(record.occurredAt)}
                  </dd>
                  <dd className="mt-0.5 text-[var(--text-secondary)]">{formatTime(record.occurredAt)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Created in EdenOS</dt>
                  <dd className="mt-1 font-medium text-[var(--text-primary)]">
                    {formatLongDate(record.createdAt)}
                  </dd>
                  <dd className="mt-0.5 text-[var(--text-secondary)]">{formatTime(record.createdAt)}</dd>
                </div>
              </dl>

              {record.note && (
                <div className="mt-5 border-t border-[var(--border-subtle)] pt-5">
                  <p className="text-sm text-[var(--text-muted)]">Note</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{record.note}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="danger" onClick={() => {
                setOperationError(null)
                setStep('delete')
              }}>
                <Trash2 aria-hidden="true" size={17} />
                Delete
              </Button>
              <Button type="button" variant="secondary" onClick={() => {
                setOperationError(null)
                setStep('edit')
              }}>
                <Pencil aria-hidden="true" size={17} />
                Edit expense
              </Button>
            </div>
          </>
        )}

        {record && step === 'edit' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Edit expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm text-[var(--text-secondary)]">
              Changes update Today as soon as they are saved.
            </DialogDescription>
            <ExpenseForm
              initialData={record}
              submitLabel="Save changes"
              onSubmit={handleSave}
              onCancel={() => {
                setOperationError(null)
                setStep('view')
              }}
              isSubmitting={isSaving}
              submitError={operationError}
            />
          </>
        )}

        {record && step === 'delete' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold text-[var(--text-primary)]">
              Delete expense?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              This will remove {record.title} and {formatMoneyExact(record.amountSen)} from your records and dashboard totals.
            </DialogDescription>

            <div className="mt-7 flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--danger-wash)] text-[var(--danger)]">
                <CalendarClock aria-hidden="true" size={20} />
              </span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{record.title}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{formatLongDate(record.occurredAt)}</p>
              </div>
            </div>

            {operationError && <InlineError message={operationError} />}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setStep('view')} disabled={isDeleting}>Cancel</Button>
              <Button type="button" variant="danger" onClick={() => void handleDelete()} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete expense'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
