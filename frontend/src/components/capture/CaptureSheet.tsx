import { Camera, Keyboard, MessageSquareText } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { expenseWriteErrorMessage } from '../../lib/expenseWriteError'
import { useRecords } from '../../state/useRecords'
import type { ExpenseData } from '../../types/records'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { ExpenseForm } from './ExpenseForm'
import { ReviewExpense } from './ReviewExpense'

type CaptureStep = 'menu' | 'expense' | 'review'

export function CaptureSheet({ children }: { children: ReactNode }) {
  const {
    drafts,
    createExpenseDraft,
    updateExpenseDraft,
    confirmExpenseDraft,
  } = useRecords()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<CaptureStep>('menu')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const confirmInFlight = useRef(false)
  const activeDraft = drafts.find((draft) => draft.id === activeDraftId)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setStep('menu')
      setActiveDraftId(null)
      setConfirmError(null)
    }
  }

  function handleExpenseReview(data: ExpenseData) {
    if (activeDraftId) {
      updateExpenseDraft(activeDraftId, data)
    } else {
      setActiveDraftId(createExpenseDraft(data))
    }
    setConfirmError(null)
    setStep('review')
  }

  async function handleConfirm() {
    if (!activeDraftId || confirmInFlight.current) return

    confirmInFlight.current = true
    setIsConfirming(true)
    setConfirmError(null)
    try {
      await confirmExpenseDraft(activeDraftId)
      handleOpenChange(false)
    } catch (error) {
      setConfirmError(expenseWriteErrorMessage(error, 'create'))
    } finally {
      confirmInFlight.current = false
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className={step === 'menu' ? undefined : 'sm:w-[min(38rem,calc(100vw-2rem))]'}>
        {step === 'menu' && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              What do you want to capture?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Start an expense draft with a quick entry.
            </DialogDescription>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setStep('expense')}
                className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--accent-primary)] bg-[var(--accent-wash)] px-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--accent-wash-strong)] focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-primary)] text-white">
                  <Keyboard aria-hidden="true" size={19} strokeWidth={1.8} />
                </span>
                Quick entry
              </button>

              <ComingSoonOption label="Text" icon={MessageSquareText} />
              <ComingSoonOption label="Photo" icon={Camera} />
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
              initialData={activeDraft?.data}
              submitLabel="Review"
              onSubmit={handleExpenseReview}
              onCancel={() => setStep(activeDraft ? 'review' : 'menu')}
            />
          </>
        )}

        {step === 'review' && activeDraft && (
          <>
            <DialogTitle className="pr-12 text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
              Review expense
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-sm leading-6 text-[var(--text-secondary)]">
              Check this draft before it joins your records.
            </DialogDescription>
            <ReviewExpense
              draft={activeDraft}
              onEdit={() => {
                setConfirmError(null)
                setStep('expense')
              }}
              onConfirm={handleConfirm}
              isConfirming={isConfirming}
              error={confirmError}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ComingSoonOption({
  label,
  icon: Icon,
}: {
  label: string
  icon: typeof Camera
}) {
  return (
    <button
      type="button"
      disabled
      className="flex min-h-30 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 text-sm font-medium text-[var(--text-secondary)] opacity-75"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <Icon aria-hidden="true" size={19} strokeWidth={1.7} />
      </span>
      <span>{label}</span>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Coming soon
      </span>
    </button>
  )
}
