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
    extract: vi.fn(async () => ({ merchant: 'SHOP', amountSen: 123, receiptDate: null,
      amountIssue: null, fallbackUsed: false })) }
}

describe('receipt OCR endpoint', () => {
  it('verifies auth before invoking provider and returns a no-store candidate', async () => {
    const deps = dependencies()
    const response = await createReceiptOcrHandler(deps)(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ merchant: 'SHOP', amountSen: 123,
      receiptDate: null, amountIssue: null, fallbackUsed: false })
    expect(deps.verifyToken).toHaveBeenCalledWith('valid')
    expect(deps.extract).toHaveBeenCalledOnce()
  })

  it('rejects missing and invalid auth without reading the image', async () => {
    const deps = dependencies()
    const handler = createReceiptOcrHandler(deps)
    expect((await handler(request(null))).status).toBe(401)
    expect((await handler(request('bad'))).status).toBe(401)
    expect(deps.extract).not.toHaveBeenCalled()
  })

  it('returns 401 for an invalid token even when Gemini is unconfigured', async () => {
    const deps = dependencies()
    deps.isConfigured = () => false
    expect((await createReceiptOcrHandler(deps)(request('bad'))).status).toBe(401)
    expect(deps.extract).not.toHaveBeenCalled()
  })

  it('reports provider configuration and failures safely', async () => {
    const deps = dependencies()
    deps.isConfigured = () => false
    expect((await createReceiptOcrHandler(deps)(request())).status).toBe(503)
    expect(deps.extract).not.toHaveBeenCalled()
    deps.isConfigured = () => true
    deps.extract = vi.fn(async () => { throw new Error('private vendor detail') })
    const response = await createReceiptOcrHandler(deps)(request())
    expect(await response.json()).toEqual({ code: 'provider' })
  })

  it('rejects invalid image bytes and unsupported MIME before extraction', async () => {
    const deps = dependencies()
    const handler = createReceiptOcrHandler(deps)
    expect((await handler(request('valid', new Uint8Array([1, 2, 3])))).status).toBe(400)
    expect((await handler(request('valid', png, 'text/plain'))).status).toBe(415)
    expect(deps.extract).not.toHaveBeenCalled()
  })
})
