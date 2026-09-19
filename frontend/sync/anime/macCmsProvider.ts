import { fetchJson, type ResilientFetchOptions } from './http'
import type { AnimeProviderConfig, AnimeUpstreamProvider, MacCmsVodItem, ProviderCategory, ProviderDetail, ProviderProbeResult } from './types'

interface MacCmsEnvelope {
  code?: unknown
  msg?: unknown
  page?: unknown
  pagecount?: unknown
  limit?: unknown
  total?: unknown
  list?: unknown
  class?: unknown
}

function integer(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function parseMacCmsEnvelope(input: unknown): { envelope: MacCmsEnvelope; items: MacCmsVodItem[] } {
  if (!input || typeof input !== 'object') throw new Error('MacCMS response is not an object')
  const envelope = input as MacCmsEnvelope
  if (!Array.isArray(envelope.list)) throw new Error('MacCMS response has no list array')
  const items = envelope.list.filter((item): item is MacCmsVodItem => Boolean(item && typeof item === 'object'))
  return { envelope, items }
}

export function parseMacCmsCategories(input: unknown): ProviderCategory[] {
  if (!input || typeof input !== 'object') return []
  const categories = (input as MacCmsEnvelope).class
  if (!Array.isArray(categories)) return []
  return categories.flatMap((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return []
    const value = raw as Record<string, unknown>
    const id = String(value.type_id ?? '').trim()
    const name = String(value.type_name ?? '').trim()
    if (!id || !name) return []
    const parentId = String(value.type_pid ?? '').trim()
    return [{ id, name, ...(parentId ? { parentId } : {}) }]
  })
}

function endpoint(config: AnimeProviderConfig, action: 'list' | 'detail', parameters: Record<string, string>): URL {
  const configured = new URL(config.baseUrl)
  const normalizedPath = configured.pathname.replace(/\/+$/, '')
  const url = /\/api\.php\/provide\/vod$/i.test(normalizedPath)
    ? new URL(configured)
    : new URL('api.php/provide/vod/', configured.href.endsWith('/') ? configured : `${configured.href}/`)
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`
  url.search = ''
  url.hash = ''
  url.searchParams.set('ac', action)
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)
  return url
}

export function createMacCmsProvider(config: AnimeProviderConfig, overrides: Partial<ResilientFetchOptions> = {}): AnimeUpstreamProvider {
  const stats = { requests: 0, retries: 0, failures: 0 }
  const requestOptions: ResilientFetchOptions = {
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    onAttempt: () => { stats.requests += 1 },
    onRetry: () => { stats.retries += 1 },
    ...overrides,
  }
  async function request(url: URL): Promise<unknown> {
    try { return await fetchJson(url, requestOptions) }
    catch (error) { stats.failures += 1; throw error }
  }
  return {
    config,
    stats,
    async fetchCategories() {
      const raw = await request(endpoint(config, 'list', { pg: '1' }))
      return parseMacCmsCategories(raw)
    },
    async fetchPage(page, search, categoryId) {
      const raw = await request(endpoint(config, 'list', {
        pg: String(page),
        ...(search ? { wd: search } : {}),
        ...(categoryId ? { t: categoryId } : {}),
      }))
      const { envelope, items } = parseMacCmsEnvelope(raw)
      return {
        page: integer(envelope.page, page),
        pageCount: Math.max(1, integer(envelope.pagecount, 1)),
        limit: integer(envelope.limit, items.length),
        total: integer(envelope.total, items.length),
        items,
        raw,
      }
    },
    async fetchDetail(providerItemId) {
      const raw = await request(endpoint(config, 'detail', { ids: providerItemId }))
      const { items } = parseMacCmsEnvelope(raw)
      const item = items.find((candidate) => String(candidate.vod_id ?? '') === providerItemId) ?? items[0]
      if (!item) throw new Error(`MacCMS detail missing item ${providerItemId}`)
      return { item, raw }
    },
    async fetchDetails(providerItemIds) {
      if (!providerItemIds.length || providerItemIds.length > 20) throw new Error('MacCMS detail batch requires 1 to 20 IDs')
      const raw = await request(endpoint(config, 'detail', { ids: providerItemIds.join(',') }))
      const { items } = parseMacCmsEnvelope(raw)
      return { items, raw }
    },
    async probe(): Promise<ProviderProbeResult> {
      try {
        const page = await this.fetchPage(1)
        const firstId = page.items[0]?.vod_id
        const detail: ProviderDetail | null = firstId === undefined || firstId === null ? null : await this.fetchDetail(String(firstId))
        return {
          providerId: config.id,
          reachable: true,
          validJson: true,
          hasPagination: page.pageCount >= 1 && page.total >= page.items.length,
          hasDetail: detail !== null,
          hasPlayback: Boolean(detail?.item.vod_play_url),
          incrementalSupported: false,
          message: 'Standard MacCMS list/detail API detected; no verified incremental parameter.',
        }
      } catch (error) {
        return {
          providerId: config.id,
          reachable: false,
          validJson: false,
          hasPagination: false,
          hasDetail: false,
          hasPlayback: false,
          incrementalSupported: false,
          message: error instanceof Error ? error.message : 'Provider probe failed',
        }
      }
    },
  }
}
