import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReceiptOcrError } from '../../services/receiptOcrService'
import { ReceiptCaptureForm } from './ReceiptCaptureForm'

const { readReceiptImage } = vi.hoisted(() => ({
  readReceiptImage: vi.fn(async () => ({ rawText: 'SHOP\nTOTAL RM1.23' })),
}))
vi.mock('../../services/receiptOcrService', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/receiptOcrService')>(), readReceiptImage,
}))

const createUrl = vi.fn(() => `blob:receipt-${createUrl.mock.calls.length}`)
const revokeUrl = vi.fn()

beforeEach(() => {
  readReceiptImage.mockClear()
  createUrl.mockClear()
  revokeUrl.mockClear()
  URL.createObjectURL = createUrl
  URL.revokeObjectURL = revokeUrl
})

function renderForm() {
  const onContinue = vi.fn()
  const onDirtyChange = vi.fn()
  const view = render(<ReceiptCaptureForm
    onContinue={onContinue} onCancel={vi.fn()} onManual={vi.fn()} onDirtyChange={onDirtyChange}
  />)
  return { ...view, onContinue, onDirtyChange }
}

function image(type: string) {
  return new File(['image'], 'receipt', { type })
}

describe('receipt image input and lifetime', () => {
  it.each(['image/jpeg', 'image/png'])('accepts %s uploads through the same read path', async (type) => {
    const { onContinue } = renderForm()
    fireEvent.change(screen.getByLabelText('Choose receipt image'), { target: { files: [image(type)] } })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ amountSen: 123 })))
    expect(readReceiptImage).toHaveBeenCalledOnce()
  })

  it('accepts a pasted image and reports a clipboard with no image', async () => {
    renderForm()
    fireEvent.paste(document, { clipboardData: { items: [] } })
    expect(screen.getByRole('alert').textContent).toContain('Paste an image')
    const pasted = image('image/webp')
    fireEvent.paste(document, { clipboardData: {
      items: [{ kind: 'file', type: 'image/webp', getAsFile: () => pasted }],
    } })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
  })

  it('rejects unsupported MIME without calling OCR', async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('Choose receipt image'), {
      target: { files: [image('text/plain')] },
    })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('JPEG, PNG, or WebP'))
    expect(readReceiptImage).not.toHaveBeenCalled()
  })

  it('revokes previews on replace, remove, and unmount', async () => {
    const view = renderForm()
    fireEvent.change(screen.getByLabelText('Choose receipt image'), { target: { files: [image('image/png')] } })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Replace image'), { target: { files: [image('image/jpeg')] } })
    await waitFor(() => expect(revokeUrl).toHaveBeenCalledWith('blob:receipt-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(revokeUrl).toHaveBeenCalledWith('blob:receipt-2')
    fireEvent.change(screen.getByLabelText('Choose receipt image'), { target: { files: [image('image/webp')] } })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    view.unmount()
    expect(revokeUrl).toHaveBeenCalledWith('blob:receipt-3')
  })

  it('keeps the image for retry after an OCR failure and offers manual entry', async () => {
    readReceiptImage.mockRejectedValueOnce(new ReceiptOcrError('provider'))
    const onManual = vi.fn()
    render(<ReceiptCaptureForm onContinue={vi.fn()} onCancel={vi.fn()}
      onManual={onManual} onDirtyChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Choose receipt image'), { target: { files: [image('image/jpeg')] } })
    await waitFor(() => expect(screen.getByAltText('Receipt preview')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('temporarily unavailable'))
    expect(screen.getByAltText('Receipt preview')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry OCR' }))
    await waitFor(() => expect(readReceiptImage).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }))
    expect(onManual).toHaveBeenCalledOnce()
  })
})
