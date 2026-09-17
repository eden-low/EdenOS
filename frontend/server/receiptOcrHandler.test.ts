// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createReceiptOcrHandler, type ReceiptOcrDependencies } from './receiptOcrHandler'

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2])

function request(token: string | null = 'valid', bytes: Uint8Array = png, type = 'image/png'): Request {
  const body = new FormData()
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  body.append('image', new Blob([copy], { type }), 'receipt.png')
  return new Request('https://example.test/.netlify/functions/receipt-ocr', {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body,
  })
}

function dependencies(): ReceiptOcrDependencies {
  return { verifyToken: vi.fn(async (token) => token === 'valid'), isConfigured: () => true,
    readText: vi.fn(async () => 'SHOP\nTOTAL RM1.23') }
}

describe('receipt OCR endpoint', () => {
  it('verifies auth before invoking provider and returns no-store normalized text', async () => {
    const deps = dependencies()
    const response = await createReceiptOcrHandler(deps)(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ rawText: 'SHOP\nTOTAL RM1.23' })
    expect(deps.verifyToken).toHaveBeenCalledWith('valid')
    expect(deps.readText).toHaveBeenCalledOnce()
  })

  it('rejects missing and invalid auth without reading the image', async () => {
    const deps = dependencies()
    const handler = createReceiptOcrHandler(deps)
    expect((await handler(request(null))).status).toBe(401)
    expect((await handler(request('bad'))).status).toBe(401)
    expect(deps.readText).not.toHaveBeenCalled()
  })

  it('reports provider configuration and failures safely', async () => {
    const deps = dependencies()
    deps.isConfigured = () => false
    expect((await createReceiptOcrHandler(deps)(request())).status).toBe(503)
    expect(deps.readText).not.toHaveBeenCalled()
    deps.isConfigured = () => true
    deps.readText = vi.fn(async () => { throw new Error('private vendor detail') })
    const response = await createReceiptOcrHandler(deps)(request())
    expect(await response.json()).toEqual({ code: 'provider' })
  })

  it('rejects empty OCR text, invalid image bytes, and unsupported MIME', async () => {
    const deps = dependencies()
    deps.readText = vi.fn(async () => '   ')
    const handler = createReceiptOcrHandler(deps)
    expect((await handler(request())).status).toBe(422)
    expect((await handler(request('valid', new Uint8Array([1, 2, 3])))).status).toBe(400)
    expect((await handler(request('valid', png, 'text/plain'))).status).toBe(415)
    expect(deps.readText).toHaveBeenCalledOnce()
  })
})
