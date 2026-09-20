import { describe, expect, it, vi } from 'vitest'
import { createR2AnimeDetailStore, readR2Configuration } from './r2Store'

const config = { accountId: 'account', accessKeyId: 'access', secretAccessKey: 'secret', bucket: 'anime' }
const detail = { schemaVersion: 1 as const, externalId: 'one-piece', title: 'One Piece', episodes: [{ episodeNumber: 1, sources: [{ label: 'Primary', url: 'https://media.example/1.m3u8', format: 'hls' as const }] }] }

describe('R2 Anime detail store', () => {
  it('requires all server-only credential names', () => {
    expect(readR2Configuration({ R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd' })).toEqual({ accountId: 'a', accessKeyId: 'b', secretAccessKey: 'c', bucket: 'd' })
    expect(readR2Configuration({ R2_ACCOUNT_ID: 'a' })).toBeNull()
  })

  it('signs a fixed R2 object path without putting secrets in the URL', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 200 }))
    const store = createR2AnimeDetailStore(config, { fetcher, now: () => new Date('2026-09-19T00:00:00Z') })
    await store.put(detail)
    const [input, init] = fetcher.mock.calls[0]!
    expect(String(input)).toBe('https://account.r2.cloudflarestorage.com/anime/anime-details/one-piece.json')
    expect(String(input)).not.toContain('secret')
    expect(init?.method).toBe('PUT')
    expect(new Headers(init?.headers).get('authorization')).toContain('Credential=access/')
    expect(String(init?.body)).toContain('"schemaVersion":1')
  })

  it('reads valid details and treats a missing object as normal', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(detail), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
    const store = createR2AnimeDetailStore(config, { fetcher })
    await expect(store.get('one-piece')).resolves.toEqual(detail)
    await expect(store.exists('missing')).resolves.toBe(false)
  })

  it('deletes only the fixed Anime detail object path', async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 204 }))
    const store = createR2AnimeDetailStore(config, { fetcher, now: () => new Date('2026-09-19T00:00:00Z') })
    await store.remove('one-piece')
    expect(String(fetcher.mock.calls[0]![0])).toBe('https://account.r2.cloudflarestorage.com/anime/anime-details/one-piece.json')
    expect(fetcher.mock.calls[0]![1]?.method).toBe('DELETE')
  })
})
