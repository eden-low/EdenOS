import { createHash } from 'node:crypto'
import { animeFilterKeysForIngestion, normalizeAnimeTitle } from '../../src/domain/anime'
import type { AnimeMediaType, AnimeRegion, AnimeStatus } from '../../src/types/anime'
import type { AnimeContentGroup, AnimeProviderConfig, MacCmsVodItem, ProviderAnimeRecord, ProviderEpisodeSource } from './types'

const htmlEntities: Record<string, string> = {
  amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return htmlEntities[entity.toLowerCase()] ?? match
  })
}

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return decodeHtmlEntities(value.normalize('NFKC')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>|<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function optionalPositiveInteger(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parseYear(value: unknown): number | undefined {
  const match = String(value ?? '').match(/(?:19|20|21)\d{2}/)
  return match ? optionalPositiveInteger(match[0]) : undefined
}

function parseScore(value: unknown): number | undefined {
  const score = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(score) && score >= 0 && score <= 10 ? score : undefined
}

export function normalizeMediaType(item: MacCmsVodItem): AnimeMediaType {
  const value = `${item.type_name ?? ''} ${item.vod_class ?? ''}`.toLocaleLowerCase()
  if (/纪录|documentary/.test(value)) return 'documentary'
  if (/电影|movie|剧场版/.test(value)) return 'movie'
  if (/电视剧|连续剧|tv\s*(series|show)|drama/.test(value)) return 'tv_series'
  return 'anime'
}

export function normalizeRegion(value: unknown): AnimeRegion | undefined {
  const text = cleanText(value).toLocaleLowerCase()
  if (!text) return undefined
  if (/日本|japan/.test(text)) return 'japan'
  if (/中国大陆|大陆|china|chinese/.test(text)) return 'china'
  if (/韩国|korea/.test(text)) return 'korea'
  if (/香港|台湾|hong\s*kong|taiwan/.test(text)) return 'hong_kong_taiwan'
  if (/欧美|美国|英国|欧洲|europe|usa|united states|western/.test(text)) return 'europe_us'
  return 'other'
}

export function normalizeStatus(value: unknown): AnimeStatus {
  const text = cleanText(value).toLocaleLowerCase()
  return /完结|已完结|completed|complete|全集/.test(text) ? 'completed' : 'airing'
}

const genreMappings: Array<[RegExp, string]> = [
  [/动作|action/i, 'Action'], [/冒险|adventure/i, 'Adventure'], [/喜剧|搞笑|comedy/i, 'Comedy'],
  [/剧情|drama/i, 'Drama'], [/奇幻|魔幻|fantasy/i, 'Fantasy'], [/悬疑|推理|mystery/i, 'Mystery'],
  [/爱情|恋爱|romance/i, 'Romance'], [/科幻|sci[ -]?fi|science fiction/i, 'Sci-Fi'], [/运动|体育|sports?/i, 'Sports'],
]

export function normalizeGenres(value: unknown): string[] {
  const text = cleanText(value)
  const genres = genreMappings.flatMap(([pattern, canonical]) => pattern.test(text) ? [canonical] : [])
  return [...new Set(genres)]
}

export function parseEpisodeNumber(label: string): number | null {
  const normalized = label.normalize('NFKC').trim()
  const patterns = [
    /^(?:ep(?:isode)?|e)\s*0*(\d+(?:\.\d+)?)$/i,
    /^第\s*0*(\d+(?:\.\d+)?)\s*(?:集|话|話)$/u,
    /^0*(\d+(?:\.\d+)?)$/,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      const parsed = Number(match[1])
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null
    }
  }
  return null
}

export function fallbackEpisodeNumber(label: string): number {
  const hash = createHash('sha256').update(normalizeAnimeTitle(label)).digest()
  return 1_000_000 + (hash.readUInt32BE(0) % 1_000_000)
}

export function classifyPlaybackUrl(raw: string): 'hls' | 'mp4' | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    const path = url.pathname.toLocaleLowerCase()
    if (path.endsWith('.m3u8')) return 'hls'
    if (path.endsWith('.mp4')) return 'mp4'
    return null
  } catch { return null }
}

export function parsePlayback(item: MacCmsVodItem): { sources: ProviderEpisodeSource[]; unsupported: number } {
  const groupNames = String(item.vod_play_from ?? '').split('$$$')
  const groups = String(item.vod_play_url ?? '').split('$$$')
  const sources: ProviderEpisodeSource[] = []
  let unsupported = 0
  groups.forEach((group, groupIndex) => {
    const groupLabel = cleanText(groupNames[groupIndex]) || `Source ${groupIndex + 1}`
    for (const entry of group.split('#').map((part) => part.trim()).filter(Boolean)) {
      const separator = entry.indexOf('$')
      const episodeTitle = cleanText(separator >= 0 ? entry.slice(0, separator) : `Episode ${sources.length + 1}`)
      const url = (separator >= 0 ? entry.slice(separator + 1) : entry).trim()
      const format = classifyPlaybackUrl(url)
      if (!format) { unsupported += 1; continue }
      sources.push({ episodeNumber: parseEpisodeNumber(episodeTitle), episodeTitle, groupLabel, url, format })
    }
  })
  const occupied = new Set(sources.flatMap((source) => source.episodeNumber ? [source.episodeNumber] : []))
  const fallbackByLabel = new Map<string, number>()
  for (const source of sources) {
    if (source.episodeNumber !== null) continue
    const normalizedLabel = normalizeAnimeTitle(source.episodeTitle)
    let fallback = fallbackByLabel.get(normalizedLabel) ?? fallbackEpisodeNumber(source.episodeTitle)
    while (occupied.has(fallback) && fallbackByLabel.get(normalizedLabel) !== fallback) fallback += 1
    fallbackByLabel.set(normalizedLabel, fallback)
    source.episodeNumber = fallback
    occupied.add(fallback)
  }
  return { sources, unsupported }
}

function parseProviderTime(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 10_000_000_000 ? value : value * 1000
  const parsed = Date.parse(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

export function normalizeProviderAnime(
  item: MacCmsVodItem,
  provider: AnimeProviderConfig,
  overrides: { mediaType?: AnimeMediaType; region?: AnimeRegion; contentGroup?: AnimeContentGroup; requiredGenres?: string[] } = {},
): { record: ProviderAnimeRecord; unsupported: number } {
  const providerItemId = String(item.vod_id ?? '').trim()
  const title = cleanText(item.vod_name)
  if (!providerItemId || !title) throw new Error('Provider item requires vod_id and vod_name')
  const playback = parsePlayback(item)
  const year = parseYear(item.vod_year)
  const totalFromRemarks = String(item.vod_remarks ?? '').match(/(?:全|共)?\s*(\d+)\s*(?:集|话|話|episodes?)/i)?.[1]
  const numericEpisodeCount = playback.sources.filter((source) => (source.episodeNumber ?? 0) < 1_000_000).length
  const totalEpisodes = optionalPositiveInteger(totalFromRemarks) ?? (numericEpisodeCount ? Math.max(...playback.sources.flatMap((source) => source.episodeNumber && source.episodeNumber < 1_000_000 ? [source.episodeNumber] : [])) : undefined)
  const alternateTitles = [item.vod_en, item.vod_sub].map(cleanText).filter(Boolean)
  const sharedExternalIds = [
    item.anilist_id ? `anilist-${String(item.anilist_id).trim()}` : '',
    item.bangumi_id ? `bangumi-${String(item.bangumi_id).trim()}` : '',
    item.imdb_id ? `imdb-${String(item.imdb_id).trim().toLocaleLowerCase()}` : '',
    item.tmdb_id ? `tmdb-${String(item.tmdb_id).trim()}` : '',
  ].filter((value) => value && !value.endsWith('-'))
  const record: ProviderAnimeRecord = {
    providerId: provider.id,
    providerDisplayName: provider.displayName,
    providerPriority: provider.priority,
    providerItemId,
    ...(overrides.contentGroup ? { contentGroup: overrides.contentGroup } : {}),
    title,
    titleNormalized: normalizeAnimeTitle(title),
    alternateTitles: [...new Set(alternateTitles)],
    sharedExternalIds,
    coverUrl: cleanText(item.vod_pic),
    ...(parseScore(item.vod_score) !== undefined ? { score: parseScore(item.vod_score) } : {}),
    mediaType: overrides.mediaType ?? normalizeMediaType(item),
    ...((overrides.region ?? normalizeRegion(item.vod_area)) ? { region: overrides.region ?? normalizeRegion(item.vod_area) } : {}),
    genres: [...new Set([...normalizeGenres(`${item.vod_class ?? ''} ${item.type_name ?? ''}`), ...(overrides.requiredGenres ?? [])])],
    status: normalizeStatus(item.vod_remarks),
    ...(year ? { year } : {}),
    ...(totalEpisodes ? { totalEpisodes } : {}),
    ...(cleanText(item.vod_content) ? { description: cleanText(item.vod_content) } : {}),
    ...(parseProviderTime(item.vod_time) ? { providerUpdatedAt: parseProviderTime(item.vod_time) } : {}),
    sources: playback.sources,
  }
  return { record, unsupported: playback.unsupported }
}

export function indexFilterKeys(record: Pick<ProviderAnimeRecord, 'mediaType' | 'region' | 'genres' | 'status' | 'year'>): string[] {
  return animeFilterKeysForIngestion(record)
}
