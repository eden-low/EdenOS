import { useEffect, useRef, useState } from 'react'
import type { GuestExitReview } from '../../types/account'
import { Button } from '../ui/button'

export function GuestExitWarning({ summary, pending, onStay, onExit }: {
  summary: GuestExitReview['summary']; pending: boolean; onStay: () => void; onExit: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const hasData = summary !== 'unavailable' && (summary.hasBlockingData || summary.animeProgressCount > 0)
  return <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
    <div role="alert" className="space-y-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-4">
      <h3 ref={heading} tabIndex={-1} className="font-semibold text-[var(--text-primary)]">Before leaving Guest</h3>
      <p>{summary === 'unavailable'
        ? 'We could not verify all Guest data. There may be saved records in this workspace.'
        : hasData ? 'Saved Guest data was found in this workspace.' : 'No saved records were reported by the completed checks.'}</p>
      <p>Signing out may permanently remove your access to this Guest identity and its records. EdenOS has no verified way to restore this Guest after exit. Copying the UID does not provide recovery.</p>
      <p>Saved records will not be deleted, migrated, merged or overwritten by this action. They remain under the Guest UID and may become inaccessible. Unsaved work will be lost.</p>
      <p>To preserve this Guest identity, stay signed in and connect a Google account that is not already used by EdenOS. Linking keeps the same UID. Merging with an existing Google account is not available.</p>
    </div>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 text-[var(--text-primary)]">
      <input type="checkbox" className="mt-1 size-5 shrink-0" checked={acknowledged} disabled={pending}
        onChange={(event) => setAcknowledged(event.target.checked)} />
      <span>I understand I may permanently lose access to this Guest identity and its records.</span>
    </label>
    <div className="grid gap-3 sm:flex sm:justify-end">
      <Button type="button" onClick={onStay} disabled={pending}>Stay in Guest</Button>
      <Button type="button" variant="secondary" disabled={pending || !acknowledged}
        onClick={() => { if (acknowledged && !pending) onExit() }}>
        {pending ? 'Signing out…' : 'Leave Guest and sign out'}
      </Button>
    </div>
  </div>
}
