import { createHash } from 'node:crypto'
import { isValidExternalId, normalizeAnimeTitle } from '../../src/domain/anime'
import type { ProviderAnimeRecord, SourceMapping, SourceMatchReason } from './types'

export interface IdentityResolution {
  groups: Map<string, ProviderAnimeRecord[]>
  mappings: SourceMapping[]
  ambiguousMatches: number
}

export function sourceMappingId(provider: string, providerItemId: string): string {
  const suffix = createHash('sha256').update(`${provider}\0${providerItemId}`).digest('hex').slice(0, 32)
  const prefix = provider.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 32)
  return `${prefix}-${suffix}`
}

function deterministicId(record: ProviderAnimeRecord, disambiguator = ''): string {
  const identity = `${record.titleNormalized}|${record.year ?? 'unknown'}|${record.mediaType}|${disambiguator}`
  return `anime-${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`
}

function sharedId(record: ProviderAnimeRecord): string | null {
  const reliable = record.sharedExternalIds.map((value) => value.trim()).find(Boolean)
  if (!reliable) return null
  const normalized = reliable.normalize('NFKC').toLocaleLowerCase().replace(/[^a-z0-9._-]/g, '-')
  const candidate = `ext-${normalized}`.slice(0, 128)
  return isValidExternalId(candidate) ? candidate : null
}

function titleSet(record: ProviderAnimeRecord): Set<string> {
  return new Set([record.titleNormalized, ...record.alternateTitles.map(normalizeAnimeTitle)])
}

function compatible(left: ProviderAnimeRecord, right: ProviderAnimeRecord): boolean {
  if (left.mediaType !== right.mediaType) return false
  if (left.year && right.year && left.year !== right.year) return false
  const rightTitles = titleSet(right)
  return [...titleSet(left)].some((title) => rightTitles.has(title))
}

export function resolveCanonicalIdentity(records: ProviderAnimeRecord[], existingMappings: Map<string, SourceMapping> = new Map()): IdentityResolution {
  const groups = new Map<string, ProviderAnimeRecord[]>()
  const mappings: SourceMapping[] = []
  let ambiguousMatches = 0
  const sorted = [...records].sort((left, right) => left.providerPriority - right.providerPriority || left.providerId.localeCompare(right.providerId) || left.providerItemId.localeCompare(right.providerItemId))
  for (const record of sorted) {
    const mapping = existingMappings.get(sourceMappingId(record.providerId, record.providerItemId))
    let externalId: string
    let matchedBy: SourceMatchReason
    if (mapping) {
      externalId = mapping.canonicalExternalId
      matchedBy = mapping.matchedBy
    } else if (sharedId(record)) {
      externalId = sharedId(record)!
      matchedBy = 'shared-id'
    } else {
      const candidates = [...groups.entries()].filter(([, members]) => members.some((member) => compatible(record, member)))
      if (candidates.length === 1) {
        externalId = candidates[0][0]
        matchedBy = 'exact-title'
      } else {
        if (candidates.length > 1) ambiguousMatches += 1
        externalId = deterministicId(record, candidates.length > 1 ? `${record.providerId}|${record.providerItemId}` : '')
        matchedBy = 'deterministic-new'
      }
    }
    const members = groups.get(externalId) ?? []
    members.push(record)
    groups.set(externalId, members)
    mappings.push({ provider: record.providerId, providerItemId: record.providerItemId, canonicalExternalId: externalId, matchedBy })
  }
  return { groups, mappings, ambiguousMatches }
}
