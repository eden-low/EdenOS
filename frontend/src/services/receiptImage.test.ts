import { describe, expect, it, vi } from 'vitest'
import { prepareReceiptImage, ReceiptImageInputError, RECEIPT_UPLOAD_MAX_BYTES } from './receiptImage'

describe('receipt image preparation', () => {
  it('passes ordinary JPEG, PNG, and WebP blobs into the same upload pipeline', async () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      const image = new Blob(['image'], { type })
      expect(await prepareReceiptImage(image)).toBe(image)
    }
  })

  it('rejects unsupported, empty, and excessive input', async () => {
    await expect(prepareReceiptImage(new Blob(['text'], { type: 'text/plain' })))
      .rejects.toEqual(new ReceiptImageInputError('unsupported'))
    await expect(prepareReceiptImage(new Blob([], { type: 'image/png' })))
      .rejects.toEqual(new ReceiptImageInputError('invalid'))
    const excessive = new Blob(['image'], { type: 'image/jpeg' })
    Object.defineProperty(excessive, 'size', { value: 20 * 1024 * 1024 + 1 })
    await expect(prepareReceiptImage(excessive))
      .rejects.toEqual(new ReceiptImageInputError('too-large'))
  })

  it('keeps the upload ceiling below the Netlify binary payload limit', () => {
    expect(RECEIPT_UPLOAD_MAX_BYTES).toBeLessThan(4.5 * 1024 * 1024)
  })

  it('compresses a large phone photo in memory before upload', async () => {
    const large = new Blob(['image'], { type: 'image/jpeg' })
    Object.defineProperty(large, 'size', { value: 8 * 1024 * 1024 })
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close })))
    const drawImage = vi.fn()
    const context = { fillStyle: '', fillRect: vi.fn(), drawImage }
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback) => callback(new Blob(['compressed'], { type: 'image/jpeg' })))
    try {
      const prepared = await prepareReceiptImage(large)
      expect(prepared.type).toBe('image/jpeg')
      expect(prepared.size).toBeLessThan(RECEIPT_UPLOAD_MAX_BYTES)
      expect(drawImage).toHaveBeenCalledOnce()
      expect(close).toHaveBeenCalledOnce()
    } finally {
      getContext.mockRestore()
      toBlob.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
