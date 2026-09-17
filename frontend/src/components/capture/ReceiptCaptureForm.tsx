import { useEffect, useRef, useState } from 'react'
import { parseReceiptText } from '../../domain/parseReceiptText'
import { prepareReceiptImage, ReceiptImageInputError } from '../../services/receiptImage'
import { readReceiptImage, ReceiptOcrError } from '../../services/receiptOcrService'
import type { ReceiptCandidate } from '../../types/receipt'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

const errorMessages = {
  unsupported: 'Choose a JPEG, PNG, or WebP receipt image.',
  'too-large': 'This image is too large to read. Choose a smaller photo or enter the expense manually.',
  invalid: 'This image could not be read. Try another photo or enter the expense manually.',
  auth: 'Your session could not be verified. Try again after reconnecting.',
  'not-configured': 'Receipt reading is not available yet. You can enter this expense manually.',
  empty: 'No readable text was found. Try a clearer photo or enter the expense manually.',
  provider: 'Receipt reading is temporarily unavailable. Try again or enter manually.',
  network: 'Could not reach receipt reading. Check your connection and try again.',
} as const

interface SelectedImage {
  blob: Blob
  previewUrl: string
}

export function ReceiptCaptureForm({
  onContinue,
  onCancel,
  onManual,
  onDirtyChange,
}: {
  onContinue: (candidate: ReceiptCandidate) => void
  onCancel: () => void
  onManual: () => void
  onDirtyChange: (isDirty: boolean) => void
}) {
  const [image, setImage] = useState<SelectedImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const previewRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  useEffect(() => {
    onDirtyChange(Boolean(image))
  }, [image, onDirtyChange])

  useEffect(() => () => {
    generationRef.current += 1
    abortRef.current?.abort()
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
  }, [])

  function clearImage() {
    generationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setImage(null)
    setError(null)
    setHasFailed(false)
    setReading(false)
  }

  async function receiveReceiptImage(input: Blob) {
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
      setError(cause instanceof ReceiptImageInputError
        ? errorMessages[cause.reason]
        : errorMessages.invalid)
    }
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const clipboard = event.clipboardData
      const file = Array.from(clipboard?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
        ?? Array.from(clipboard?.files ?? []).find((item) => item.type.startsWith('image/'))
      if (!file) {
        setError('Paste an image of one receipt, or choose a photo instead.')
        return
      }
      event.preventDefault()
      void receiveReceiptImage(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  })

  async function handleRead() {
    if (!image || reading) return
    const controller = new AbortController()
    abortRef.current = controller
    setReading(true)
    setError(null)
    try {
      const result = await readReceiptImage(image.blob, controller.signal)
      if (controller.signal.aborted) return
      const candidate = parseReceiptText(result.rawText, new Date())
      onContinue(candidate)
    } catch (cause) {
      if (controller.signal.aborted) return
      setHasFailed(true)
      setError(cause instanceof ReceiptOcrError
        ? errorMessages[cause.code]
        : errorMessages.network)
    } finally {
      if (!controller.signal.aborted) setReading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  return (
    <div>
      <input
        id="receipt-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void receiveReceiptImage(file)
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary"><label htmlFor="receipt-file">{image ? 'Replace image' : 'Choose receipt image'}</label></Button>
        {image && <Button type="button" variant="ghost" onClick={clearImage} disabled={reading}>Remove</Button>}
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Or paste a receipt image with Ctrl+V / Cmd+V.</p>
      {image && (
        <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          <img src={image.previewUrl} alt="Receipt preview" className="mx-auto max-h-64 max-w-full object-contain" />
        </div>
      )}
      {error && <InlineError message={error} />}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={reading}>Back</Button>
        <Button type="button" variant="secondary" onClick={onManual} disabled={reading}>Enter manually</Button>
        <Button type="button" onClick={() => void handleRead()} disabled={!image || reading}>
          {reading ? 'Reading receipt...' : hasFailed ? 'Retry OCR' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
