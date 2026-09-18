import { localDateKey } from '../lib/date'

// Hitokoto sentence API v1: https://developer.hitokoto.cn/sentence/
// d = literature, e = original, i = poetry, k = philosophy.
export const quoteCategories = ['d', 'e', 'i', 'k'] as const
export const dailyQuoteCacheKey = 'edenos.dailyQuote.v1'
const failedAttemptKey = 'edenos.dailyQuote.failedAttempt.v1'
const maximumLength = 40
const timeoutMs = 5_000
const failureRetryMs = 30 * 60_000

export interface DailyQuote {
  uuid: string
  text: string
  type: string
  source: string | null
  author: string | null
  length: number
}

interface CachedQuote {
  date: string
  quote: DailyQuote
}

type QuoteFetcher = (input: string, init?: RequestInit) => Promise<Response>

function optionalText(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || null
}

export function parseDailyQuote(value: unknown): DailyQuote | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  const source = optionalText(data.from)
  const author = optionalText(data.from_who)
  if (typeof data.uuid !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.uuid) ||
      typeof data.hitokoto !== 'string' || !data.hitokoto.trim() ||
      data.hitokoto.length > maximumLength ||
      typeof data.type !== 'string' || !quoteCategories.some((category) => category === data.type) ||
      !Number.isInteger(data.length) || typeof data.length !== 'number' ||
      data.length < 1 || data.length > maximumLength ||
      source === undefined || author === undefined) return null
  return {
    uuid: data.uuid,
    text: data.hitokoto.trim(),
    type: data.type,
    source,
    author,
    length: data.length,
  }
}

function readCachedQuote(storage: Storage): CachedQuote | null {
  try {
    const raw = storage.getItem(dailyQuoteCacheKey)
    if (!raw) return null
    const cached: unknown = JSON.parse(raw)
    if (!cached || typeof cached !== 'object' ||
        !('date' in cached) || typeof cached.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(cached.date) ||
        !('quote' in cached) || !cached.quote || typeof cached.quote !== 'object') return null
    const saved = cached.quote as Record<string, unknown>
    const quote = parseDailyQuote({
      uuid: saved.uuid,
      hitokoto: saved.text,
      type: saved.type,
      from: saved.source,
      from_who: saved.author,
      length: saved.length,
    })
    return quote ? { date: cached.date, quote } : null
  } catch {
    return null
  }
}

function recentlyFailed(storage: Storage, date: string): boolean {
  try {
    const raw = storage.getItem(failedAttemptKey)
    if (!raw) return false
    const attempt: unknown = JSON.parse(raw)
    return !!attempt && typeof attempt === 'object' &&
      'date' in attempt && attempt.date === date &&
      'at' in attempt && typeof attempt.at === 'number' &&
      Date.now() - attempt.at < failureRetryMs && Date.now() >= attempt.at
  } catch {
    return false
  }
}

function rememberFailure(storage: Storage, date: string): void {
  try { storage.setItem(failedAttemptKey, JSON.stringify({ date, at: Date.now() })) } catch { /* optional cache */ }
}

export function cachedDailyQuote(storage: Storage, date: Date): DailyQuote | null {
  const cached = readCachedQuote(storage)
  return cached?.date === localDateKey(date) ? cached.quote : null
}

let inFlight: { date: string; promise: Promise<DailyQuote | null> } | null = null

export async function loadDailyQuote(
  storage: Storage,
  date: Date,
  fetcher: QuoteFetcher = fetch,
): Promise<DailyQuote | null> {
  const dateKey = localDateKey(date)
  const previous = readCachedQuote(storage)
  if (previous?.date === dateKey) return previous.quote
  if (recentlyFailed(storage, dateKey)) return previous?.quote ?? null
  if (inFlight?.date === dateKey) return inFlight.promise

  const promise = (async () => {
    const url = new URL('https://v1.hitokoto.cn/')
    for (const category of quoteCategories) url.searchParams.append('c', category)
    url.searchParams.set('max_length', String(maximumLength))
    url.searchParams.set('encode', 'json')
    try {
      const response = await fetcher(url.toString(), {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        rememberFailure(storage, dateKey)
        return previous?.quote ?? null
      }
      const quote = parseDailyQuote(await response.json())
      if (!quote) {
        rememberFailure(storage, dateKey)
        return previous?.quote ?? null
      }
      try { storage.setItem(dailyQuoteCacheKey, JSON.stringify({ date: dateKey, quote })) } catch { /* optional cache */ }
      try { storage.removeItem(failedAttemptKey) } catch { /* optional cache */ }
      return quote
    } catch {
      rememberFailure(storage, dateKey)
      return previous?.quote ?? null
    }
  })()
  inFlight = { date: dateKey, promise }
  try {
    return await promise
  } finally {
    if (inFlight?.promise === promise) inFlight = null
  }
}
