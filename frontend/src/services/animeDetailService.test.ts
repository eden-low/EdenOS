import { beforeEach, describe, expect, it, vi } from 'vitest'
import { animeDetail } from '../test/animeFixtures'
import { AnimeDetailError, clearAnimeDetailCache, invalidateAnimeDetail, loadAnimeDetail } from './animeDetailService'

describe('Anime detail service', () => {
  beforeEach(() => { clearAnimeDetailCache(); vi.stubEnv('VITE_ANIME_DETAILS_BASE_URL', 'https://library.example/') })

  it('lazy-loads the fixed object path and caches successful details in memory', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify(animeDetail()), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).resolves.toMatchObject({ externalId: 'sample-anime' })
    await loadAnimeDetail('sample-anime', fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(String(fetcher.mock.calls[0][0])).toBe('https://library.example/anime-details/sample-anime.json')
  })

  it.each([[404, 'not-found'], [500, 'network']] as const)('maps HTTP %s to %s', async (status, code) => {
    const fetcher = vi.fn(async () => new Response('', { status }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code })
    expect(fetcher).toHaveBeenCalledTimes(status === 500 ? 2 : 1)
  })

  it('retries one transient transport failure and caches the successful detail', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify(animeDetail()), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).resolves.toMatchObject({ externalId: 'sample-anime' })
    await loadAnimeDetail('sample-anime', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed JSON and retries after invalidation', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ wrong: true }), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code: 'malformed' })
    invalidateAnimeDetail('sample-anime')
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toBeInstanceOf(AnimeDetailError)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failed request and refetches the same externalId', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(animeDetail()), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code: 'not-found' })
    await expect(loadAnimeDetail('sample-anime', fetcher)).resolves.toMatchObject({ externalId: 'sample-anime' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('rejects a detail whose externalId does not match the catalogue request', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(animeDetail({ externalId: 'other-anime' })), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code: 'malformed' })
  })

  it('reports missing configuration without making a request', async () => {
    vi.stubEnv('VITE_ANIME_DETAILS_BASE_URL', '')
    const fetcher = vi.fn()
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code: 'not-configured' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('maps a network failure and rejects unsafe external IDs', async () => {
    await expect(loadAnimeDetail('sample-anime', vi.fn(async () => { throw new Error('offline') }))).rejects.toMatchObject({ code: 'network' })
    await expect(loadAnimeDetail('../secret', vi.fn())).rejects.toMatchObject({ code: 'malformed' })
  })
})
