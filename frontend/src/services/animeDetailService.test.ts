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
    await expect(loadAnimeDetail('sample-anime', vi.fn(async () => new Response('', { status })))).rejects.toMatchObject({ code })
  })

  it('rejects malformed JSON and retries after invalidation', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ wrong: true }), { status: 200 }))
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toMatchObject({ code: 'malformed' })
    invalidateAnimeDetail('sample-anime')
    await expect(loadAnimeDetail('sample-anime', fetcher)).rejects.toBeInstanceOf(AnimeDetailError)
    expect(fetcher).toHaveBeenCalledTimes(2)
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
