import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReceiptCaptureForm } from './ReceiptCaptureForm'
import { FitnessScreenshotCaptureForm } from './FitnessScreenshotCaptureForm'
import { BatchScreenshotInput } from '../finance/BatchScreenshotInput'

vi.mock('../../services/receiptOcrService', async (original) => ({ ...await original<object>(), readReceiptImage: vi.fn() }))
vi.mock('../../services/fitnessScreenshotService', () => ({ readFitnessScreenshot: vi.fn() }))
vi.mock('../../services/batchScreenshotService', async (original) => ({ ...await original<object>(), readBatchTransactionScreenshot: vi.fn() }))
const blob = () => new Blob(['synthetic image bytes'], { type: 'image/png' })
const item = (image = blob()) => ({ types: [image.type], getType: vi.fn(async () => image) })
const props = () => ({ onContinue: vi.fn(), onCancel: vi.fn(), onManual: vi.fn(), onDirtyChange: vi.fn() })
const entries = [
  { name: 'Receipt', component: ReceiptCaptureForm, preview: 'Receipt preview', input: 'receipt-file' },
  { name: 'Fitness', component: FitnessScreenshotCaptureForm, preview: 'Fitness screenshot preview', input: 'fitness-screenshot-file' },
  { name: 'Batch', component: BatchScreenshotInput, preview: 'Transaction history screenshot preview', input: 'batch-screenshot-file' },
]
beforeEach(() => {
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 100, height: 100, close: vi.fn() })))
  URL.createObjectURL = vi.fn(() => `blob:synthetic-${vi.mocked(URL.createObjectURL).mock.calls.length}`)
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
function clipboard(read: () => Promise<unknown>) { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read } }) }

describe.each(entries)('$name image input', ({ component: Component, preview, input }) => {
  it('reads only on the iPhone button click and waits for browser approval without starting OCR', async () => {
    let allow!: (items: unknown[]) => void
    const read = vi.fn(() => new Promise<unknown[]>((resolve) => { allow = resolve }))
    clipboard(read)
    const callbacks = props()
    render(<Component {...callbacks} />)
    expect(read).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Paste Image / 粘贴图片' }))
    expect(read).toHaveBeenCalledOnce()
    expect(screen.queryByAltText(preview)).toBeNull()
    await act(async () => allow([item()]))
    await waitFor(() => expect(screen.getByAltText(preview)).toBeTruthy())
    expect(callbacks.onContinue).not.toHaveBeenCalled()
  })
  it('retains desktop keyboard paste and upload, and revokes replace/remove/unmount resources', async () => {
    const view = render(<Component {...props()} />)
    fireEvent.paste(document, { clipboardData: { files: [blob()] } })
    await waitFor(() => expect(screen.getByAltText(preview)).toBeTruthy())
    fireEvent.change(document.getElementById(input)!, { target: { files: [blob()] } })
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-2')
    fireEvent.change(document.getElementById(input)!, { target: { files: [blob()] } })
    await waitFor(() => expect(screen.getByAltText(preview)).toBeTruthy())
    view.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-3')
  })
  it.each(['denied', 'empty', 'text', 'unsupported', 'corrupt', 'missing', 'insecure'])('handles %s clipboard without accepting unverifiable content', async (kind) => {
    const read = vi.fn(async () => {
      if (kind === 'denied') throw new DOMException('denied', 'NotAllowedError')
      if (kind === 'empty') return []
      return [item(kind === 'text' ? new Blob(['text'], { type: 'text/plain' }) : kind === 'unsupported' ? new Blob(['svg'], { type: 'image/svg+xml' }) : blob())]
    })
    clipboard(read)
    if (kind === 'missing') Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    if (kind === 'insecure') vi.stubGlobal('isSecureContext', false)
    if (kind === 'corrupt') vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('decode failed'))
    render(<Component {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Paste Image/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Choose Image \/ Upload/))
    expect(screen.queryByAltText(preview)).toBeNull()
  })
  it('discards a pending clipboard result after an upload replacement or navigation', async () => {
    let finish!: (items: unknown[]) => void
    clipboard(() => new Promise<unknown[]>((resolve) => { finish = resolve }))
    const callbacks = props()
    const view = render(<Component {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /Paste Image/ }))
    fireEvent.change(document.getElementById(input)!, { target: { files: [blob()] } })
    await waitFor(() => expect(screen.getByAltText(preview)).toBeTruthy())
    await act(async () => finish([item()]))
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /^(Back|Cancel)$/ }))
    expect(callbacks.onCancel).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-1')
    view.unmount()
  })
  it('discards a clipboard result after unmount', async () => {
    let finish!: (items: unknown[]) => void
    clipboard(() => new Promise<unknown[]>((resolve) => { finish = resolve }))
    const view = render(<Component {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Paste Image/ }))
    view.unmount()
    await act(async () => finish([item()]))
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('releases the temporary decoder URL on Safari fallback cancellation', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      naturalWidth = 100
      naturalHeight = 100
    })
    clipboard(async () => [item()])
    const view = render(<Component {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: /Paste Image/ }))
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledOnce())
    view.unmount()
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-1'))
    expect(screen.queryByAltText(preview)).toBeNull()
  })
})
