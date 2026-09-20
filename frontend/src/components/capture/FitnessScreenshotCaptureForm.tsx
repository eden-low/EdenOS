import { useEffect, useRef, useState } from 'react'
import { prepareReceiptImage, ReceiptImageInputError } from '../../services/receiptImage'
import { readFitnessScreenshot } from '../../services/fitnessScreenshotService'
import { ReceiptOcrError } from '../../services/receiptOcrService'
import type { FitnessScreenshotCandidate } from '../../types/fitnessScreenshot'
import { Button } from '../ui/button'
import { InlineError } from '../ui/InlineError'

const messages = {
  unsupported: 'Choose a JPEG, PNG, or WebP screenshot.',
  'too-large': 'This screenshot is too large. Choose a smaller image or enter the exercise manually.',
  invalid: 'This screenshot could not be read. Try another image.',
  auth: 'Your session could not be verified. Try again after reconnecting.',
  'not-configured': 'Screenshot reading is not available yet. Enter the exercise manually.',
  provider: 'Screenshot reading is temporarily unavailable. Try a screenshot showing one completed workout, or enter manually.',
  network: 'Could not reach screenshot reading. Check your connection, retry, or enter manually.',
} as const

export function FitnessScreenshotCaptureForm({ onContinue, onCancel, onManual, onDirtyChange }: {
  onContinue: (candidate: FitnessScreenshotCandidate) => void
  onCancel: () => void
  onManual: () => void
  onDirtyChange: (dirty: boolean) => void
}) {
  const [image, setImage] = useState<{ blob: Blob; previewUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [failed, setFailed] = useState(false)
  const previewRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const generationRef = useRef(0)

  useEffect(() => { onDirtyChange(Boolean(image)) }, [image, onDirtyChange])
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
    setImage(null); setError(null); setFailed(false); setReading(false)
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
      setError(cause instanceof ReceiptImageInputError ? messages[cause.reason] : messages.invalid)
    }
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
      if (!file) return
      event.preventDefault()
      void receiveImage(file)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  })

  async function handleRead() {
    if (!image || reading) return
    const controller = new AbortController()
    abortRef.current = controller
    setReading(true); setError(null)
    try {
      const candidate = await readFitnessScreenshot(image.blob, controller.signal)
      if (!controller.signal.aborted) onContinue(candidate)
    } catch (cause) {
      if (!controller.signal.aborted) {
        setFailed(true)
        setError(cause instanceof ReceiptOcrError ? messages[cause.code] : messages.network)
      }
    } finally {
      if (!controller.signal.aborted) setReading(false)
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  return <div>
    <div className="mb-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--accent-teal-wash)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
      <p className="font-semibold text-[var(--text-primary)]">Upload one completed Workout detail or workout summary screen.</p>
      <p className="mt-1">Include activity, duration, distance when available, and Active Calories when available. Daily Activity or daily Steps overviews may not describe one workout.</p>
    </div>
    <input id="fitness-screenshot-file" type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only"
      onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void receiveImage(file) }} />
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="secondary"><label htmlFor="fitness-screenshot-file">{image ? 'Replace screenshot' : 'Choose fitness screenshot'}</label></Button>
      {image && <Button type="button" variant="ghost" onClick={clearImage} disabled={reading}>Remove</Button>}
    </div>
    <p className="mt-3 text-sm text-[var(--text-muted)]">Or paste a workout screenshot with Ctrl+V / Cmd+V.</p>
    {image && <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      <img src={image.previewUrl} alt="Fitness screenshot preview" className="mx-auto max-h-64 max-w-full object-contain" />
    </div>}
    {error && <InlineError message={error} />}
    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={reading}>Back</Button>
      <Button type="button" variant="secondary" onClick={onManual} disabled={reading}>Enter manually</Button>
      <Button type="button" onClick={() => void handleRead()} disabled={!image || reading}>
        {reading ? 'Reading workout…' : failed ? 'Retry' : 'Continue'}
      </Button>
    </div>
  </div>
}
