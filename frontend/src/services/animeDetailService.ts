import { isValidExternalId, parseAnimeDetail } from '../domain/anime'
import type { AnimeDetail } from '../types/anime'

export type AnimeDetailErrorCode = 'not-configured' | 'not-found' | 'network' | 'malformed'

export class AnimeDetailError extends Error {
  readonly code: AnimeDetailErrorCode

  constructor(code: AnimeDetailErrorCode) {
    super(code)
    this.name = 'AnimeDetailError'
    this.code = code
  }
}

const detailCache = new Map<string, AnimeDetail>()
const inFlight = new Map<string, Promise<AnimeDetail>>()

function configuredBaseUrl(): URL | null {
  const raw = import.meta.env.VITE_ANIME_DETAILS_BASE_URL
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? url : null
  } catch {
    return null
  }
}

export async function loadAnimeDetail(
  externalId: string,
  fetcher: typeof fetch = fetch,
): Promise<AnimeDetail> {
  if (!isValidExternalId(externalId)) throw new AnimeDetailError('malformed')
  const cached = detailCache.get(externalId)
  if (cached) return cached
  const pending = inFlight.get(externalId)
  if (pending) return pending
  const base = configuredBaseUrl()
  if (!base) throw new AnimeDetailError('not-configured')

  const promise = (async () => {
    const objectUrl = new URL(`anime-details/${encodeURIComponent(externalId)}.json`, base.href.endsWith('/') ? base : `${base.href}/`)
    let response: Response
    try {
      response = await fetcher(objectUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) })
    } catch {
      throw new AnimeDetailError('network')
    }
    if (response.status === 404) throw new AnimeDetailError('not-found')
    if (!response.ok) throw new AnimeDetailError('network')
    let json: unknown
    try { json = await response.json() } catch { throw new AnimeDetailError('malformed') }
    const detail = parseAnimeDetail(json, externalId)
    if (!detail) throw new AnimeDetailError('malformed')
    detailCache.set(externalId, detail)
    return detail
  })()
  inFlight.set(externalId, promise)
  try { return await promise } finally { inFlight.delete(externalId) }
}

export function invalidateAnimeDetail(externalId: string): void {
  detailCache.delete(externalId)
  inFlight.delete(externalId)
}

export function clearAnimeDetailCache(): void {
  detailCache.clear()
  inFlight.clear()
}
