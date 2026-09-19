import { normalizeAnimeTitle } from '../../src/domain/anime'
import type { AnimeMediaType, AnimeRegion } from '../../src/types/anime'
import { cleanText, normalizeRegion } from './normalize'
import type { AnimeContentGroup, MacCmsVodItem, ProviderCategory } from './types'

export type AnimeImportRegion = Extract<AnimeRegion, 'japan' | 'china' | 'europe_us'>

export interface AnimeCategoryPolicy {
  typeId: string
  typeName: string
  group: AnimeContentGroup
  mediaType: AnimeMediaType
  fallbackRegion: AnimeRegion
  requiredGenres: string[]
}

export type AnimeContentRejection = 'commentary' | 'category-not-allowed' | 'missing-title'

export type AnimeContentDecision =
  | {
    accepted: true
    region: AnimeRegion
    mediaType: AnimeMediaType
    group: AnimeContentGroup
    requiredGenres: string[]
    category: AnimeCategoryPolicy
  }
  | { accepted: false; reason: AnimeContentRejection }

export const animeContentGroups: AnimeContentGroup[] = [
  'china_anime',
  'east_asia_anime',
  'western_anime',
  'hong_kong_taiwan_anime',
  'overseas_anime',
  'animation_movie',
]

const categoryPolicies = new Map<string, Omit<AnimeCategoryPolicy, 'typeId' | 'typeName'>>([
  ['国产动漫', { group: 'china_anime', mediaType: 'anime', fallbackRegion: 'china', requiredGenres: [] }],
  ['日韩动漫', { group: 'east_asia_anime', mediaType: 'anime', fallbackRegion: 'other', requiredGenres: [] }],
  ['欧美动漫', { group: 'western_anime', mediaType: 'anime', fallbackRegion: 'europe_us', requiredGenres: [] }],
  ['港台动漫', { group: 'hong_kong_taiwan_anime', mediaType: 'anime', fallbackRegion: 'hong_kong_taiwan', requiredGenres: [] }],
  ['海外动漫', { group: 'overseas_anime', mediaType: 'anime', fallbackRegion: 'other', requiredGenres: [] }],
  ['动画片', { group: 'animation_movie', mediaType: 'movie', fallbackRegion: 'other', requiredGenres: ['Animation'] }],
])

function policyText(value: unknown): string {
  return cleanText(value).normalize('NFKC')
    .replace(/[【〖［]/g, '[')
    .replace(/[】〗］]/g, ']')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCommentaryItem(item: Pick<MacCmsVodItem, 'vod_name' | 'vod_class' | 'type_name'>): boolean {
  const category = policyText(`${item.type_name ?? ''} ${item.vod_class ?? ''}`)
  if (/(?:电影|影视|动漫|动画)?解说/.test(category)) return true
  const title = policyText(item.vod_name)
  if (!title) return false
  return /(?:^|[[(])(?:电影|影视|动漫|动画)?解说(?:[\])]|$)/.test(title) ||
    /(?:\[?(?:电影|影视|动漫|动画)解说\]?|解说)$/.test(title) ||
    /(?:深度)?实机赏析|(?:电影|影视|动漫|动画|影片|深度)赏析|(?:电影|影视|动漫|动画|剧情)解析/.test(title)
}

export function discoverAnimeCategoryPolicies(categories: ProviderCategory[]): AnimeCategoryPolicy[] {
  const policies: AnimeCategoryPolicy[] = []
  for (const category of categories) {
    const typeName = policyText(category.name)
    const policy = categoryPolicies.get(typeName)
    if (!policy) continue
    policies.push({ typeId: String(category.id), typeName, ...policy })
  }
  return policies.sort((left, right) => animeContentGroups.indexOf(left.group) - animeContentGroups.indexOf(right.group) || left.typeId.localeCompare(right.typeId))
}

export function classifyAnimeContent(item: MacCmsVodItem, policies: AnimeCategoryPolicy[]): AnimeContentDecision {
  const title = policyText(item.vod_name)
  if (!title || !normalizeAnimeTitle(title)) return { accepted: false, reason: 'missing-title' }
  if (isCommentaryItem(item)) return { accepted: false, reason: 'commentary' }
  const itemTypeId = String(item.type_id ?? '').trim()
  const itemTypeName = policyText(item.type_name)
  const category = policies.find((policy) => policy.typeId === itemTypeId && policy.typeName === itemTypeName)
  if (!category) return { accepted: false, reason: 'category-not-allowed' }
  const sourceRegion = normalizeRegion(item.vod_area)
  return {
    accepted: true,
    region: sourceRegion ?? category.fallbackRegion,
    mediaType: category.mediaType,
    group: category.group,
    requiredGenres: category.requiredGenres,
    category,
  }
}

export function animeContentTargets(value: string | undefined): Record<AnimeImportRegion, number> | undefined {
  if (!value?.trim()) return undefined
  const result: Record<AnimeImportRegion, number> = { japan: 0, china: 0, europe_us: 0 }
  for (const entry of value.split(',')) {
    const [rawRegion, rawCount] = entry.split(':')
    const region = rawRegion?.trim() as AnimeImportRegion
    const count = Number(rawCount)
    if (!isLegacyRegion(region) || !Number.isInteger(count) || count < 0 || count > 650) {
      throw new Error('--content-targets must use japan:N,china:N,europe_us:N with counts from 0 to 650')
    }
    result[region] = count
  }
  if (Object.values(result).reduce((sum, count) => sum + count, 0) > 650) throw new Error('Anime content target total must not exceed 650')
  return result
}

export function animeContentGroupTargets(value: string | undefined): Record<AnimeContentGroup, number> | undefined {
  if (!value?.trim()) return undefined
  const result = Object.fromEntries(animeContentGroups.map((group) => [group, 0])) as Record<AnimeContentGroup, number>
  for (const entry of value.split(',')) {
    const [rawGroup, rawCount] = entry.split(':')
    const group = rawGroup?.trim() as AnimeContentGroup
    const count = Number(rawCount)
    if (!animeContentGroups.includes(group) || !Number.isInteger(count) || count < 0 || count > 9_500) {
      throw new Error(`--content-groups must use ${animeContentGroups.join('|')}:N with counts from 0 to 9500`)
    }
    result[group] = count
  }
  if (Object.values(result).reduce((sum, count) => sum + count, 0) > 9_500) throw new Error('Anime content group target total must not exceed 9500')
  return result
}

function isLegacyRegion(value: string): value is AnimeImportRegion {
  return value === 'japan' || value === 'china' || value === 'europe_us'
}
