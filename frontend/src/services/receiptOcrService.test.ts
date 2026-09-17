import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getIdToken, auth } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'id-token'),
  auth: { currentUser: null as null | { getIdToken: () => Promise<string> } },
}))
vi.mock('../lib/firebase', () => ({ firebaseInitialization: {
  status: 'ready', services: { auth },
} }))

import { readReceiptImage, ReceiptOcrError } from './receiptOcrService'

beforeEach(() => {
  auth.currentUser = { getIdToken }
  getIdToken.mockClear()
  vi.restoreAllMocks()
})

describe('receipt OCR browser boundary', () => {
  it('sends a Firebase ID token and image to the same-origin endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ rawText: 'SHOP\nTOTAL RM1.23' }), { status: 200 },
    ))
    const result = await readReceiptImage(new Blob(['image'], { type: 'image/png' }))
    expect(result.rawText).toContain('SHOP')
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/.netlify/functions/receipt-ocr')
    expect(options?.headers).toEqual({ Authorization: 'Bearer id-token' })
    expect(options?.body).toBeInstanceOf(FormData)
    expect(options?.cache).toBe('no-store')
  })

  it('does not upload without an authenticated Firebase user', async () => {
    auth.currentUser = null
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(readReceiptImage(new Blob(['image'], { type: 'image/png' })))
      .rejects.toEqual(new ReceiptOcrError('auth'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps provider and transport failures without exposing server details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ code: 'not-configured', detail: 'private' }), { status: 503 },
    )).mockRejectedValueOnce(new Error('private network detail'))
    const image = new Blob(['image'], { type: 'image/png' })
    await expect(readReceiptImage(image)).rejects.toEqual(new ReceiptOcrError('not-configured'))
    await expect(readReceiptImage(image)).rejects.toEqual(new ReceiptOcrError('network'))
  })
})
