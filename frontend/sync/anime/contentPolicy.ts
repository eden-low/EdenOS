import { normalizeAnimeTitle } from '../../src/domain/anime'
import type { AnimeRegion } from '../../src/types/anime'
import { cleanText, normalizeRegion } from './normalize'
import type { MacCmsVodItem, ProviderCategory } from './types'

export type AnimeImportRegion = Extract<AnimeRegion, 'japan' | 'china' | 'europe_us'>

export interface AnimeCategoryPolicy {
  typeId: string
  typeName: string
  region: AnimeImportRegion
}

export type AnimeContentRejection =
  | 'commentary'
  | 'category-not-allowed'
  | 'region-not-allowed'
  | 'missing-title'

export type AnimeContentDecision =
  | { accepted: true; region: AnimeImportRegion; category: AnimeCategoryPolicy }
  | { accepted: false; reason: AnimeContentRejection }

const categoryRegions = new Map<string, AnimeImportRegion>([
  ['国产动漫', 'china'],
  ['日韩动漫', 'japan'],
  ['欧美动漫', 'europe_us'],
])

function policyText(value: unknown): string {
  return cleanText(value).normalize('NFKC')
    .replace(/[【〔［]/g, '[')
    .replace(/[】〕］]/g, ']')
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
    /(?:\[?(?:电影|影视|动漫|动画)解说\]?|解说)$/.test(title)
}

export function discoverAnimeCategoryPolicies(categories: ProviderCategory[]): AnimeCategoryPolicy[] {
  const policies: AnimeCategoryPolicy[] = []
  for (const category of categories) {
    const typeName = policyText(category.name)
    const region = categoryRegions.get(typeName)
    if (!region) continue
    policies.push({ typeId: String(category.id), typeName, region })
  }
  return policies.sort((left, right) => left.region.localeCompare(right.region) || left.typeId.localeCompare(right.typeId))
}

export function classifyAnimeContent(item: MacCmsVodItem, policies: AnimeCategoryPolicy[], options: { allowMissingJapaneseArea?: boolean } = {}): AnimeContentDecision {
  const title = policyText(item.vod_name)
  if (!title || !normalizeAnimeTitle(title)) return { accepted: false, reason: 'missing-title' }
  if (isCommentaryItem(item)) return { accepted: false, reason: 'commentary' }
  const itemTypeId = String(item.type_id ?? '').trim()
  const itemTypeName = policyText(item.type_name)
  const category = policies.find((policy) => policy.typeId === itemTypeId && policy.typeName === itemTypeName)
  if (!category) return { accepted: false, reason: 'category-not-allowed' }
  const sourceRegion = normalizeRegion(item.vod_area)
  if (category.region === 'japan' && sourceRegion !== 'japan' && !(options.allowMissingJapaneseArea && sourceRegion === undefined)) return { accepted: false, reason: 'region-not-allowed' }
  if (category.region === 'china' && sourceRegion && sourceRegion !== 'china' && sourceRegion !== 'other') return { accepted: false, reason: 'region-not-allowed' }
  if (category.region === 'europe_us' && sourceRegion && sourceRegion !== 'europe_us' && sourceRegion !== 'other') return { accepted: false, reason: 'region-not-allowed' }
  return { accepted: true, region: category.region, category }
}

export function animeContentTargets(value: string | undefined): Record<AnimeImportRegion, number> | undefined {
  if (!value?.trim()) return undefined
  const result: Record<AnimeImportRegion, number> = { japan: 0, china: 0, europe_us: 0 }
  for (const entry of value.split(',')) {
    const [rawRegion, rawCount] = entry.split(':')
    const region = rawRegion?.trim() as AnimeImportRegion
    const count = Number(rawCount)
    if (!categoryRegionsHasRegion(region) || !Number.isInteger(count) || count < 0 || count > 650) {
      throw new Error('--content-targets must use japan:N,china:N,europe_us:N with counts from 0 to 650')
    }
    result[region] = count
  }
  if (Object.values(result).reduce((sum, count) => sum + count, 0) > 650) throw new Error('Anime content target total must not exceed 650')
  return result
}

function categoryRegionsHasRegion(value: string): value is AnimeImportRegion {
  return value === 'japan' || value === 'china' || value === 'europe_us'
}
