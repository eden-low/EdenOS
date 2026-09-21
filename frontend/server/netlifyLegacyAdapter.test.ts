// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createNetlifyLegacyHandler } from './netlifyLegacyAdapter'

describe('Netlify legacy adapter', () => {
  it('preserves method, headers, binary request body, and Fetch response metadata', async () => {
    const fetchHandler = vi.fn(async (request: Request) => {
      expect(request.method).toBe('POST')
      expect(request.headers.get('authorization')).toBe('Bearer test')
      expect(new Uint8Array(await request.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
      return new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      })
    })
    const handler = createNetlifyLegacyHandler(fetchHandler)
    const result = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer test', host: 'example.test' },
      body: Buffer.from([1, 2, 3]).toString('base64'),
      isBase64Encoded: true,
      path: '/.netlify/functions/example',
    })
    expect(fetchHandler).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ statusCode: 202, body: '{"ok":true}' })
    expect(result.headers['cache-control']).toBe('no-store')
  })

  it('does not attach a body to GET requests', async () => {
    const handler = createNetlifyLegacyHandler(async (request) => {
      expect(request.url).toBe('https://example.test/direct')
      expect(await request.text()).toBe('')
      return new Response('method', { status: 405 })
    })
    await expect(handler({ httpMethod: 'GET', headers: {}, body: null, rawUrl: 'https://example.test/direct' }))
      .resolves.toMatchObject({ statusCode: 405, body: 'method' })
  })
})
