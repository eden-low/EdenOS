import { useImagePaste } from '../../hooks/useImagePaste'
import { useEffect, useRef, useState } from 'react'
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

  const { pasteImage, cancelPaste, pasting } = useImagePaste((blob) => void receiveReceiptImage(blob), setError, clearImage)

  function clearImage() {
    cancelPaste()
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


  async function handleRead() {
    if (!image || reading) return
    const controller = new AbortController()
    abortRef.current = controller
    setReading(true)
    setError(null)
    try {
      const candidate = await readReceiptImage(image.blob, controller.signal)
      if (controller.signal.aborted) return
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
        <Button type="button" variant="secondary" onClick={pasteImage} disabled={reading || pasting}>{pasting ? 'Waiting for Paste…' : 'Paste Image / 粘贴图片'}</Button>
        {image && <Button type="button" variant="ghost" onClick={clearImage} disabled={reading}>Remove</Button>}
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Copy an image, tap Paste Image, then choose the system Paste option if asked. Ctrl+V / Cmd+V and image upload also work.</p>
      {image && (
        <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
          <img src={image.previewUrl} alt="Receipt preview" className="mx-auto max-h-64 max-w-full object-contain" />
        </div>
      )}
      {error && <InlineError message={error} />}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => { clearImage(); onCancel() }} disabled={reading}>Back</Button>
        <Button type="button" variant="secondary" onClick={() => { clearImage(); onManual() }} disabled={reading}>Enter manually</Button>
        <Button type="button" onClick={() => void handleRead()} disabled={!image || reading}>
          {reading ? 'Reading receipt...' : hasFailed ? 'Retry' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
