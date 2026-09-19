import { describe, expect, it, vi } from 'vitest'
import { createMacCmsProvider } from './macCmsProvider'
import { fetchJson, ProviderHttpError } from './http'
import { envelope, providerConfig, vodItem } from './testFixtures'

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('MacCMS provider', () => {
  it('uses a configured V10 provider endpoint without duplicating its path', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify(envelope([])), { status: 200 }))
    const provider = createMacCmsProvider(providerConfig({ baseUrl: new URL('https://provider.example/api.php/provide/vod/') }), { fetcher })
    await provider.fetchPage(1)
    const requested = new URL(String(fetcher.mock.calls[0]![0]))
    expect(requested.pathname).toBe('/api.php/provide/vod/')
    expect(requested.searchParams.get('ac')).toBe('list')
  })

  it('reads standard list pagination and encodes search', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => response(envelope([vodItem()], { page: 2, pagecount: 4, total: 61 })))
    const provider = createMacCmsProvider(providerConfig(), { fetcher })
    const page = await provider.fetchPage(2, 'One Piece')
    expect(page).toMatchObject({ page: 2, pageCount: 4, total: 61 })
    const url = new URL(String(fetcher.mock.calls[0][0]))
    expect(url.pathname).toBe('/api.php/provide/vod/')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ ac: 'list', pg: '2', wd: 'One Piece' })
  })

  it('reads detail by id and probes playback fields', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => response(envelope([vodItem({ vod_id: new URL(String(input)).searchParams.get('ids') ?? '101' })])))
    const provider = createMacCmsProvider(providerConfig(), { fetcher })
    expect((await provider.fetchDetail('101')).item.vod_name).toBe('One Piece')
    await expect(provider.probe()).resolves.toMatchObject({ reachable: true, validJson: true, hasPagination: true, hasDetail: true, hasPlayback: true, incrementalSupported: false })
  })

  it('retries retryable responses with bounded exponential backoff', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ error: true }, 503))
      .mockResolvedValueOnce(response(envelope()))
    const sleep = vi.fn(async () => undefined)
    await expect(fetchJson(new URL('https://provider.example/api'), { timeoutMs: 10, maxRetries: 2, fetcher, sleep, random: () => 0 })).resolves.toMatchObject({ code: 1 })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(250)
  })

  it('does not retry a provider 4xx', async () => {
    const fetcher = vi.fn(async () => response({}, 404))
    await expect(fetchJson(new URL('https://provider.example/api'), { timeoutMs: 10, maxRetries: 2, fetcher })).rejects.toMatchObject({ code: 'http-404', status: 404 })
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('reports malformed JSON and exhausted network failures', async () => {
    const malformed = vi.fn(async () => new Response('{', { status: 200 }))
    await expect(fetchJson(new URL('https://provider.example/api'), { timeoutMs: 10, maxRetries: 2, fetcher: malformed })).rejects.toBeInstanceOf(ProviderHttpError)
    const network = vi.fn(async () => { throw new Error('timeout') })
    await expect(fetchJson(new URL('https://provider.example/api'), { timeoutMs: 10, maxRetries: 1, fetcher: network, sleep: async () => undefined })).rejects.toMatchObject({ code: 'network' })
    expect(network).toHaveBeenCalledTimes(2)
  })
})
