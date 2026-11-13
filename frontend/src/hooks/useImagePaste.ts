import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prepareReceiptImage } from '../services/receiptImage'

const fallback = 'Use Choose Image / Upload, or paste an image with Ctrl+V / Cmd+V.'

/** Clipboard images must decode, rather than merely claiming an image MIME type. */
async function verifyImage(blob: Blob, signal: AbortSignal): Promise<Blob> {
  const prepared = await prepareReceiptImage(blob)
  signal.throwIfAborted()
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(prepared)
    try {
      signal.throwIfAborted()
      if (!bitmap.width || !bitmap.height) throw new Error('invalid')
    } finally { bitmap.close() }
  } else {
    const url = URL.createObjectURL(prepared)
    try {
      await new Promise<void>((resolve, reject) => {
        const image = new Image()
        const cleanup = () => {
          image.onload = image.onerror = null
          signal.removeEventListener('abort', abort)
          image.src = ''
        }
        const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')) }
        image.onload = () => {
          const valid = image.naturalWidth && image.naturalHeight
          cleanup()
          if (valid) resolve()
          else reject(new Error('invalid'))
        }
        image.onerror = () => { cleanup(); reject(new Error('invalid')) }
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) { abort(); return }
        image.src = url
      })
    } finally { URL.revokeObjectURL(url) }
  }
  return prepared
}

export function useImagePaste(onImage: (blob: Blob) => void, onError: (message: string) => void, onStart?: () => void) {
  const callbacks = useRef({ onImage, onError, onStart })
  useLayoutEffect(() => { callbacks.current = { onImage, onError, onStart } })
  const generation = useRef(0)
  const decoding = useRef<AbortController | null>(null)
  const [pasting, setPasting] = useState(false)

  function cancelPaste() { generation.current += 1; decoding.current?.abort(); setPasting(false) }

  async function accept(blob: Blob, request: number) {
    if (request !== generation.current) return
    decoding.current?.abort()
    const controller = new AbortController()
    decoding.current = controller
    const timeout = setTimeout(() => controller.abort(), 10000)
    try {
      const verified = await verifyImage(blob, controller.signal)
      if (request === generation.current) callbacks.current.onImage(verified)
    } catch {
      if (request === generation.current) callbacks.current.onError(`Paste an image in JPEG, PNG, or WebP format that can be verified. ${fallback}`)
    } finally {
      clearTimeout(timeout)
      if (decoding.current === controller) decoding.current = null
      if (request === generation.current) setPasting(false)
    }
  }

  function pasteImage() {
    callbacks.current.onStart?.()
    const request = ++generation.current
    if (!window.isSecureContext || typeof navigator.clipboard?.read !== 'function') {
      callbacks.current.onError(`Image clipboard access is unavailable in this browser. ${fallback}`)
      setPasting(false)
      return
    }
    // Call read synchronously inside the click. No permissions query or await before it:
    // Safari/PWA requires transient user activation and its native Paste confirmation.
    let reading: Promise<ClipboardItems>
    try { reading = navigator.clipboard.read() } catch {
      callbacks.current.onError(`Clipboard access was denied or cancelled. ${fallback}`)
      return
    }
    setPasting(true)
    void reading.then(async (items) => {
      if (request !== generation.current) return
      for (const item of items) {
        const type = item.types.find((value) => ['image/png', 'image/jpeg', 'image/webp'].includes(value))
        if (type) { await accept(await item.getType(type), request); return }
      }
      if (request === generation.current) {
        callbacks.current.onError(`Clipboard is empty or has no supported image. ${fallback}`)
        setPasting(false)
      }
    }).catch(() => {
      if (request === generation.current) {
        callbacks.current.onError(`Clipboard access was denied, cancelled, or could not be read. ${fallback}`)
        setPasting(false)
      }
    })
  }

  useEffect(() => {
    function paste(event: ClipboardEvent) {
      const data = event.clipboardData
      const blob = Array.from(data?.items ?? []).find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
        ?? Array.from(data?.files ?? []).find((file) => file.type.startsWith('image/'))
      if (!blob) {
        // Ordinary text paste remains available in editable fields.
        if (!(event.target instanceof HTMLElement && event.target.closest('input,textarea,[contenteditable]'))) {
          callbacks.current.onError(`Paste an image, or choose a photo instead. ${fallback}`)
        }
        return
      }
      event.preventDefault()
      callbacks.current.onStart?.()
      const request = ++generation.current
      setPasting(true)
      void accept(blob, request)
    }
    document.addEventListener('paste', paste)
    return () => { generation.current += 1; decoding.current?.abort(); document.removeEventListener('paste', paste) }
  }, [])

  return { pasteImage, cancelPaste, pasting }
}
