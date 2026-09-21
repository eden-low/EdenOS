import { ImageUp, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { BatchScreenshotCandidateResult } from '../../domain/batchScreenshotTransactions'
import { BatchScreenshotError, readBatchTransactionScreenshot } from '../../services/batchScreenshotService'
import { prepareReceiptImage, ReceiptImageInputError } from '../../services/receiptImage'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

const inputMessages = {
  unsupported: 'Choose a JPEG, PNG, or WebP transaction screenshot.',
  'too-large': 'This screenshot is too large to read. Choose a smaller image.',
  invalid: 'This screenshot could not be read. Try another image.',
} as const

const extractionMessages = {
  auth: 'Your session could not be verified. Reconnect, then try again.',
  unsupported: inputMessages.unsupported,
  'too-large': inputMessages['too-large'],
  invalid: inputMessages.invalid,
  'not-configured': 'Transaction screenshot extraction is not available yet.',
  provider: 'Image extraction is temporarily unavailable. Try again later or paste the transactions as text.',
  network: 'Could not reach transaction screenshot extraction. Check your connection and retry.',
  'no-rows': 'Could not detect transaction rows. Choose a screenshot showing the activity list clearly.',
  'too-many': 'This screenshot contains more than 100 rows. Batch Import V1 cannot review it safely.',
} as const

export function BatchScreenshotInput({ onContinue, onCancel }: {
  onContinue: (result: BatchScreenshotCandidateResult) => void
  onCancel: () => void
}) {
  const [image, setImage] = useState<{ blob: Blob; previewUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [failed, setFailed] = useState(false)
  const previewRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  useEffect(() => () => {
    generationRef.current += 1
    abortRef.current?.abort()
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  function clearImage() {
    generationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setImage(null)
    setError(null)
    setFailed(false)
    setReading(false)
  }

  async function receiveImage(input: Blob) {
    clearImage()
    const generation = generationRef.current
    try {
      const blob = await prepareReceiptImage(input)
      if (generation !== generationRef.current) return
      const previewUrl = URL.createObjectURL(blob)
      previewRef.current = previewUrl
      setImage({ blob, previewUrl })
    } catch (cause) {
      if (generation !== generationRef.current) return
      setError(cause instanceof ReceiptImageInputError ? inputMessages[cause.reason] : inputMessages.invalid)
    }
  }

  async function extract() {
    if (!image || reading) return
    const controller = new AbortController()
    abortRef.current = controller
    setReading(true)
    setError(null)
    try {
      const result = await readBatchTransactionScreenshot(image.blob, controller.signal)
      if (!controller.signal.aborted) onContinue(result)
    } catch (cause) {
      if (!controller.signal.aborted) {
        setFailed(true)
        setError(cause instanceof BatchScreenshotError ? extractionMessages[cause.code] : extractionMessages.network)
      }
    } finally {
      if (!controller.signal.aborted) setReading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  return <div className="mt-6">
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-teal-wash)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
      <p className="font-semibold text-[var(--text-primary)]">Upload one transaction activity/history screenshot.</p>
      <p className="mt-1">Multiple visible rows will be extracted for review. Nothing is saved until Confirm Transactions.</p>
    </div>
    <input id="batch-screenshot-file" aria-label="Choose transaction screenshot" type="file"
      accept="image/jpeg,image/png,image/webp,image/*" className="sr-only"
      onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void receiveImage(file) }} />
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <Button asChild variant="secondary"><label htmlFor="batch-screenshot-file"><ImageUp size={17} />{image ? 'Replace screenshot' : 'Choose screenshot'}</label></Button>
      {image && <Button type="button" variant="ghost" onClick={clearImage} disabled={reading}><Trash2 size={16} />Remove</Button>}
    </div>
    {image && <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      <img src={image.previewUrl} alt="Transaction history screenshot preview" className="mx-auto max-h-72 max-w-full object-contain" />
    </div>}
    {error && <InlineError message={error} />}
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={reading}>Cancel</Button>
      <Button type="button" onClick={() => void extract()} disabled={!image || reading}>
        {reading ? 'Reading screenshot...' : failed ? 'Retry extraction' : 'Extract Transactions'}
      </Button>
    </div>
  </div>
}
