import { Download, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useRecords } from '../state/useRecords'
import { Button } from '../components/ui/button'
import { InlineError } from '../components/ui/InlineError'
import { usePwaUpdate } from './usePwaUpdate'

export function PwaUpdatePrompt() {
  const { drafts } = useRecords()
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate()
  const [draftWarningAcknowledged, setDraftWarningAcknowledged] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const hasDrafts = drafts.some((draft) => draft.status === 'draft')

  if (!updateAvailable) return null

  async function handleUpdate() {
    if (hasDrafts && !draftWarningAcknowledged) {
      setDraftWarningAcknowledged(true)
      return
    }

    setIsApplying(true)
    setUpdateError(null)
    try {
      await applyUpdate()
    } catch {
      setUpdateError('The update could not be applied. Your current session is unchanged.')
      setIsApplying(false)
    }
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="dashboard-card fixed inset-x-3 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-[45] mx-auto max-w-md p-5 shadow-[var(--shadow-soft)] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-wash)] text-[var(--accent-soft)]">
          {draftWarningAcknowledged ? (
            <TriangleAlert aria-hidden="true" size={18} />
          ) : (
            <Download aria-hidden="true" size={18} />
          )}
        </span>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">
            {draftWarningAcknowledged ? 'Unsaved draft in progress' : 'An EdenOS update is ready'}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {draftWarningAcknowledged
              ? 'Updating now will discard local drafts that have not been confirmed.'
              : 'Apply it when you are ready. EdenOS will not reload automatically.'}
          </p>
        </div>
      </div>

      {updateError && <InlineError message={updateError} />}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={dismissUpdate} disabled={isApplying}>
          Later
        </Button>
        <Button type="button" onClick={() => void handleUpdate()} disabled={isApplying}>
          {isApplying
            ? 'Updating…'
            : draftWarningAcknowledged
              ? 'Update and discard drafts'
              : 'Update now'}
        </Button>
      </div>
    </aside>
  )
}
