import { Camera, Dumbbell, Keyboard, MessageSquareText } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ExerciseTextCandidate, ExerciseTextParseResult } from '../../domain/parseExerciseText'
import { exerciseWriteErrorMessage } from '../../lib/exerciseWriteError'
import { expenseWriteErrorMessage } from '../../lib/expenseWriteError'
import { useRecords } from '../../state/useRecords'
import type { ExpenseData, ExpenseDraft, ExerciseData, ExerciseDraft } from '../../types/records'
import type { ReceiptCandidate } from '../../types/receipt'
import { Button } from '../ui/button'
import { capturePressFeedback } from '../ui/pressFeedback'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { ExerciseForm } from './ExerciseForm'
import { ExerciseTextCaptureForm } from './ExerciseTextCaptureForm'
import { ReviewExercise } from './ReviewExercise'
import { ReviewExpense } from './ReviewExpense'
import { ReceiptCaptureForm } from './ReceiptCaptureForm'
import { TextCaptureForm } from './TextCaptureForm'

type CaptureStep = 'menu' | 'expense' | 'expense-text' | 'expense-receipt' | 'expense-receipt-edit' | 'expense-review' | 'exercise' | 'exercise-text' | 'exercise-review'

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
  const [exerciseText, setExerciseText] = useState('')
  const [exerciseTextError, setExerciseTextError] = useState<string | null>(null)
  const [exerciseTextCandidate, setExerciseTextCandidate] = useState<ExerciseTextCandidate | null>(null)
  const [stepHeight, setStepHeight] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stepContent, setStepContent] = useState<HTMLDivElement | null>(null)
  const [closingDraft, setClosingDraft] = useState<ExpenseDraft | ExerciseDraft | null>(null)
  const confirmInFlight = useRef(false)
  const activeExpenseDraft = drafts.find(
    (draft): draft is ExpenseDraft => draft.kind === 'expense' && draft.id === activeDraftId,
  )
  const activeExerciseDraft = drafts.find(
    (draft): draft is ExerciseDraft => draft.kind === 'exercise' && draft.id === activeDraftId,
  )
  const visibleExpenseDraft = activeExpenseDraft ?? (!open && closingDraft?.kind === 'expense' ? closingDraft : undefined)
  const visibleExerciseDraft = activeExerciseDraft ?? (!open && closingDraft?.kind === 'exercise' ? closingDraft : undefined)

  useLayoutEffect(() => {
    if (!open || !stepContent) return
    const content = stepContent
    const measure = () => {
      const height = content.offsetHeight
      if (height > 0) setStepHeight(height)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [open, stepContent])

  useEffect(() => {
    if (!successMessage) return
    const timeout = window.setTimeout(() => setSuccessMessage(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [successMessage])

  function clearCaptureState() {
    setStep('menu')
    setActiveDraftId(null)
    setConfirmError(null)
    setHasUnsavedFormChanges(false)
    setReceiptCandidate(null)
    setDiscardConfirmationOpen(false)
    setExerciseText('')
    setExerciseTextError(null)
    setExerciseTextCandidate(null)
    setStepHeight(null)
    setClosingDraft(null)
  }

  function resetAndClose() {
    setClosingDraft(activeExpenseDraft ?? activeExerciseDraft ?? null)
    setOpen(false)
    setDiscardConfirmationOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      clearCaptureState()
      setSuccessMessage(null)
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

  function handleExerciseTextContinue(result: ExerciseTextParseResult) {
    if (result.kind === 'empty') {
      setExerciseTextError('Describe an activity and duration, like running 45min.')
      return
    }
    setExerciseTextError(null)
    if (result.kind === 'complete') {
      handleExerciseReview(result.data)
      return
    }
    setExerciseTextCandidate(result.candidate)
    setHasUnsavedFormChanges(true)
    setStep('exercise')
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
      setSuccessMessage('Exercise saved')
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
        {...capturePressFeedback}
        variant="capture"
        closeDisabled={isConfirming || discardConfirmationOpen}
        className="sm:w-[min(38rem,calc(100vw-2rem))]"
      >
        <div className="capture-scroll-region" style={{ height: stepHeight ?? undefined }}>
          <div ref={setStepContent} key={step} className="capture-step">
        {step === 'menu' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Capture
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Choose a method. Review before confirming.
            </DialogDescription>
            <div className="mt-6 space-y-6">
              <section aria-labelledby="capture-expense-heading">
                <h2 id="capture-expense-heading" className="section-label mb-3">Expense</h2>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    aria-label="Expense Manual"
                    className="capture-method capture-method-expense"
                    onClick={() => {
                      setHasUnsavedFormChanges(false)
                      setStep('expense')
                    }}
                  >
                    <Keyboard aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>Manual</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Expense Text"
                    className="capture-method capture-method-expense"
                    onClick={() => {
                      setHasUnsavedFormChanges(false)
                      setStep('expense-text')
                    }}
                  >
                    <MessageSquareText aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>Text</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Expense Receipt"
                    className="capture-method capture-method-expense"
                    onClick={() => {
                      setHasUnsavedFormChanges(false)
                      setStep('expense-receipt')
                    }}
                  >
                    <Camera aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>Receipt</span>
                  </button>
                </div>
              </section>
              <section aria-labelledby="capture-exercise-heading" className="border-t border-[var(--border-subtle)] pt-5">
                <h2 id="capture-exercise-heading" className="section-label mb-3">Exercise</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-label="Exercise Manual"
                    className="capture-method capture-method-exercise"
                    onClick={() => {
                      setExerciseTextCandidate(null)
                      setHasUnsavedFormChanges(false)
                      setStep('exercise')
                    }}
                  >
                    <Dumbbell aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>Manual</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Exercise Text"
                    className="capture-method capture-method-exercise"
                    onClick={() => {
                      setHasUnsavedFormChanges(false)
                      setStep('exercise-text')
                    }}
                  >
                    <MessageSquareText aria-hidden="true" size={20} strokeWidth={1.8} />
                    <span>Text</span>
                  </button>
                </div>
              </section>
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

        {step === 'expense-review' && visibleExpenseDraft && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Review expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check this draft before it joins your records.
            </DialogDescription>
            <ReviewExpense
              draft={visibleExpenseDraft}
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
              {exerciseTextCandidate ? 'Complete exercise' : 'Manual Exercise'}
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              {exerciseTextCandidate
                ? 'Check the fields we could read, then complete or correct this exercise before review.'
                : 'Capture the session essentials. Nothing is trusted until you confirm it.'}
            </DialogDescription>
            <ExerciseForm
              initialData={activeExerciseDraft?.data ?? exerciseTextCandidate ?? undefined}
              submitLabel="Review"
              onSubmit={handleExerciseReview}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setStep(activeExerciseDraft ? 'exercise-review' : exerciseTextCandidate ? 'exercise-text' : 'menu')
              }}
              onDirtyChange={(dirty) => setHasUnsavedFormChanges(dirty || Boolean(exerciseTextCandidate))}
            />
          </>
        )}

        {step === 'exercise-text' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Exercise text
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Describe one session, then review it before confirming.
            </DialogDescription>
            <ExerciseTextCaptureForm
              text={exerciseText}
              onTextChange={(value) => {
                setExerciseText(value)
                setExerciseTextError(null)
                setHasUnsavedFormChanges(value.length > 0)
              }}
              onContinue={handleExerciseTextContinue}
              onCancel={() => {
                setHasUnsavedFormChanges(false)
                setExerciseTextCandidate(null)
                setExerciseText('')
                setStep('menu')
              }}
              onManual={() => {
                setExerciseTextCandidate(null)
                setExerciseText('')
                setHasUnsavedFormChanges(false)
                setStep('exercise')
              }}
              error={exerciseTextError}
            />
          </>
        )}

        {step === 'exercise-review' && visibleExerciseDraft && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Review exercise
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check this draft before it joins your records.
            </DialogDescription>
            <ReviewExercise
              data={visibleExerciseDraft.data}
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
          </div>
        </div>
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
      {successMessage && (
        <div role="status" aria-live="polite" className="capture-success">
          {successMessage}
        </div>
      )}
    </Dialog>
  )
}
