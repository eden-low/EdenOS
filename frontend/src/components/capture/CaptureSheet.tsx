import { Camera, Dumbbell, Keyboard, MessageSquareText } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { exerciseWriteErrorMessage } from '../../lib/exerciseWriteError'
import { expenseWriteErrorMessage } from '../../lib/expenseWriteError'
import { useRecords } from '../../state/useRecords'
import type { ExpenseData, ExpenseDraft, ExerciseData, ExerciseDraft } from '../../types/records'
import type { ReceiptCandidate } from '../../types/receipt'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { ExerciseForm } from './ExerciseForm'
import { ReviewExercise } from './ReviewExercise'
import { ReviewExpense } from './ReviewExpense'
import { ReceiptCaptureForm } from './ReceiptCaptureForm'
import { TextCaptureForm } from './TextCaptureForm'

type CaptureStep = 'menu' | 'expense' | 'expense-text' | 'expense-receipt' | 'expense-receipt-edit' | 'expense-review' | 'exercise' | 'exercise-review'

export function CaptureSheet({ children }: { children: ReactNode }) {
  const {
    drafts,
    discardDraft,
    createExpenseDraft,
    updateExpenseDraft,
    confirmExpenseDraft,
    createExerciseDraft,
    updateExerciseDraft,
    confirmExerciseDraft,
  } = useRecords()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<CaptureStep>('menu')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [hasUnsavedFormChanges, setHasUnsavedFormChanges] = useState(false)
  const [receiptCandidate, setReceiptCandidate] = useState<ReceiptCandidate | null>(null)
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false)
  const confirmInFlight = useRef(false)
  const activeExpenseDraft = drafts.find(
    (draft): draft is ExpenseDraft => draft.kind === 'expense' && draft.id === activeDraftId,
  )
  const activeExerciseDraft = drafts.find(
    (draft): draft is ExerciseDraft => draft.kind === 'exercise' && draft.id === activeDraftId,
  )

  function resetAndClose() {
    setOpen(false)
    setStep('menu')
    setActiveDraftId(null)
    setConfirmError(null)
    setHasUnsavedFormChanges(false)
    setReceiptCandidate(null)
    setDiscardConfirmationOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true)
      return
    }

    if (isConfirming) return
    if (activeDraftId || hasUnsavedFormChanges) {
      setDiscardConfirmationOpen(true)
      return
    }

    resetAndClose()
  }

  function handleDiscard() {
    if (activeDraftId) discardDraft(activeDraftId)
    resetAndClose()
  }

  function handleExpenseReview(data: ExpenseData) {
    if (activeExpenseDraft) {
      updateExpenseDraft(activeExpenseDraft.id, data)
    } else {
      setActiveDraftId(createExpenseDraft(data))
    }
    setHasUnsavedFormChanges(false)
    setConfirmError(null)
    setStep('expense-review')
  }

  function handleExerciseReview(data: ExerciseData) {
    if (activeExerciseDraft) {
      updateExerciseDraft(activeExerciseDraft.id, data)
    } else {
      setActiveDraftId(createExerciseDraft(data))
    }
    setHasUnsavedFormChanges(false)
    setConfirmError(null)
    setStep('exercise-review')
  }

  async function handleExpenseConfirm() {
    if (!activeExpenseDraft || confirmInFlight.current) return

    confirmInFlight.current = true
    setIsConfirming(true)
    setConfirmError(null)
    try {
      await confirmExpenseDraft(activeExpenseDraft.id)
      resetAndClose()
    } catch (error) {
      setConfirmError(expenseWriteErrorMessage(error, 'create'))
    } finally {
      confirmInFlight.current = false
      setIsConfirming(false)
    }
  }

  async function handleExerciseConfirm() {
    if (!activeExerciseDraft || confirmInFlight.current) return

    confirmInFlight.current = true
    setIsConfirming(true)
    setConfirmError(null)
    try {
      await confirmExerciseDraft(activeExerciseDraft.id)
      resetAndClose()
    } catch (error) {
      setConfirmError(exerciseWriteErrorMessage(error, 'create'))
    } finally {
      confirmInFlight.current = false
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        closeDisabled={isConfirming || discardConfirmationOpen}
        className={step === 'menu' ? undefined : 'sm:w-[min(38rem,calc(100vw-2rem))]'}
      >
        {step === 'menu' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              What do you want to capture?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Start an expense or exercise draft.
            </DialogDescription>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setHasUnsavedFormChanges(false)
                  setStep('expense')
                }}
                className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--accent-primary)] bg-[var(--accent-wash)] px-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--accent-wash-strong)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-primary)] text-white">
                  <Keyboard aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                Quick entry
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasUnsavedFormChanges(false)
                  setStep('exercise')
                }}
                className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--accent-teal)] bg-[var(--accent-teal-wash)] px-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-teal)] text-[var(--surface-base)]">
                  <Dumbbell aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                Exercise
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasUnsavedFormChanges(false)
                  setStep('expense-text')
                }}
                className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--accent-soft)]">
                  <MessageSquareText aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                Text Capture
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasUnsavedFormChanges(false)
                  setStep('expense-receipt')
                }}
                className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--accent-soft)]">
                  <Camera aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                Receipt Capture
              </button>
            </div>
          </>
        )}

        {step === 'expense' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Quick Expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Capture the essentials now. Nothing is trusted until you confirm it.
            </DialogDescription>
            <ExpenseForm
              initialData={activeExpenseDraft?.data}
              submitLabel="Review"
              onSubmit={handleExpenseReview}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setStep(activeExpenseDraft ? 'expense-review' : 'menu')
              }}
              onDirtyChange={setHasUnsavedFormChanges}
            />
          </>
        )}

        {step === 'expense-text' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Text Capture
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Describe one expense, then review it before confirming.
            </DialogDescription>
            <TextCaptureForm
              onContinue={handleExpenseReview}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setStep('menu')
              }}
              onManual={() => {
                setHasUnsavedFormChanges(false)
                setStep('expense')
              }}
              onDirtyChange={setHasUnsavedFormChanges}
            />
          </>
        )}

        {step === 'expense-receipt' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Receipt Capture
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Choose or paste one receipt image, then edit what was read.
            </DialogDescription>
            <ReceiptCaptureForm
              onContinue={(candidate) => {
                setReceiptCandidate(candidate)
                setHasUnsavedFormChanges(true)
                setStep('expense-receipt-edit')
              }}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setStep('menu')
              }}
              onManual={() => {
                setReceiptCandidate(null)
                setHasUnsavedFormChanges(false)
                setStep('expense')
              }}
              onDirtyChange={setHasUnsavedFormChanges}
            />
          </>
        )}

        {step === 'expense-receipt-edit' && receiptCandidate && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Edit receipt expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check every field before review. The receipt image is no longer kept.
            </DialogDescription>
            {receiptCandidate.amountIssue && (
              <p className="mb-5 text-sm text-[var(--text-secondary)]">
                {receiptCandidate.amountIssue === 'ambiguous'
                  ? 'Several totals were found. Enter the correct amount.'
                  : 'A clear total was not found. Enter the amount.'}
              </p>
            )}
            <ExpenseForm
              receiptCandidate={receiptCandidate}
              submitLabel="Review"
              onSubmit={handleExpenseReview}
              onCancel={() => {
                setReceiptCandidate(null)
                setHasUnsavedFormChanges(false)
                setStep('menu')
              }}
              onDirtyChange={() => setHasUnsavedFormChanges(true)}
            />
          </>
        )}

        {step === 'expense-review' && activeExpenseDraft && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Review expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check this draft before it joins your records.
            </DialogDescription>
            <ReviewExpense
              draft={activeExpenseDraft}
              onEdit={() => {
                setConfirmError(null)
                setHasUnsavedFormChanges(false)
                setStep('expense')
              }}
              onConfirm={handleExpenseConfirm}
              isConfirming={isConfirming}
              error={confirmError}
            />
          </>
        )}

        {step === 'exercise' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Manual Exercise
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Capture the session essentials. Nothing is trusted until you confirm it.
            </DialogDescription>
            <ExerciseForm
              initialData={activeExerciseDraft?.data}
              submitLabel="Review"
              onSubmit={handleExerciseReview}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setStep(activeExerciseDraft ? 'exercise-review' : 'menu')
              }}
              onDirtyChange={setHasUnsavedFormChanges}
            />
          </>
        )}

        {step === 'exercise-review' && activeExerciseDraft && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Review exercise
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check this draft before it joins your records.
            </DialogDescription>
            <ReviewExercise
              data={activeExerciseDraft.data}
              onEdit={() => {
                setConfirmError(null)
                setHasUnsavedFormChanges(false)
                setStep('exercise')
              }}
              onConfirm={handleExerciseConfirm}
              isConfirming={isConfirming}
              error={confirmError}
            />
          </>
        )}
      </DialogContent>

      <Dialog open={discardConfirmationOpen} onOpenChange={setDiscardConfirmationOpen}>
        <DialogContent showCloseButton={false} className="sm:w-[min(28rem,calc(100vw-2rem))]">
          <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
            Discard this draft?
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Your unconfirmed changes will be removed from this session.
          </DialogDescription>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDiscardConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDiscard}>
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
