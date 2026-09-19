import { describe, expect, it } from 'vitest'
import { normalizeProviderAnime } from './normalize'
import { resolveCanonicalIdentity, sourceMappingId } from './identity'
import { mergeCanonicalAnime } from './merge'
import { providerConfig, vodItem } from './testFixtures'
import type { MacCmsVodItem, SourceMapping } from './types'

function record(provider = 'provider-a', priority = 1, overrides: Partial<MacCmsVodItem> = {}) {
  return normalizeProviderAnime(vodItem(overrides), providerConfig({ id: provider, displayName: provider === 'provider-a' ? 'Provider A' : 'Provider B', priority })).record
}

describe('canonical identity and merge', () => {
  it('merges exact normalized title with compatible year and type', () => {
    const resolution = resolveCanonicalIdentity([record(), record('provider-b', 2, { vod_id: '202', vod_name: 'Ｏｎｅ Piece' })])
    expect(resolution.groups.size).toBe(1)
    expect(resolution.mappings[1].matchedBy).toBe('exact-title')
  })

  it('does not merge incompatible years', () => {
    expect(resolveCanonicalIdentity([record(), record('provider-b', 2, { vod_id: '202', vod_year: '2024' })]).groups.size).toBe(2)
  })

  it('reuses persistent provider source mapping', () => {
    const mapped = record()
    const mapping: SourceMapping = { provider: mapped.providerId, providerItemId: mapped.providerItemId, canonicalExternalId: 'stable-one-piece', matchedBy: 'source-map' }
    const resolution = resolveCanonicalIdentity([mapped], new Map([[sourceMappingId(mapped.providerId, mapped.providerItemId), mapping]]))
    expect([...resolution.groups.keys()]).toEqual(['stable-one-piece'])
  })

  it('uses deterministic IDs independent of provider order', () => {
    const a = record(); const b = record('provider-b', 2, { vod_id: '202' })
    expect([...resolveCanonicalIdentity([a, b]).groups.keys()]).toEqual([...resolveCanonicalIdentity([b, a]).groups.keys()])
  })

  it('does not auto-merge an ambiguous exact-title candidate', () => {
    const a = record('provider-a', 1)
    const b = record('provider-b', 2, { vod_id: '202' })
    const mappings = new Map<string, SourceMapping>([
      [sourceMappingId(a.providerId, a.providerItemId), { provider: a.providerId, providerItemId: a.providerItemId, canonicalExternalId: 'one-piece-a', matchedBy: 'source-map' }],
      [sourceMappingId(b.providerId, b.providerItemId), { provider: b.providerId, providerItemId: b.providerItemId, canonicalExternalId: 'one-piece-b', matchedBy: 'source-map' }],
    ])
    const third = record('provider-c', 3, { vod_id: '303' })
    const resolution = resolveCanonicalIdentity([a, b, third], mappings)
    expect(resolution.groups.size).toBe(3)
    expect(resolution.ambiguousMatches).toBe(1)
  })

  it('prefers one exact primary-title match over a competing alternate-title match', () => {
    const exact = record('provider-a', 1)
    const alternate = record('provider-b', 2, { vod_id: '202', vod_name: 'Different Series', vod_en: 'One Piece' })
    const mappings = new Map<string, SourceMapping>([
      [sourceMappingId(exact.providerId, exact.providerItemId), { provider: exact.providerId, providerItemId: exact.providerItemId, canonicalExternalId: 'one-piece', matchedBy: 'source-map' }],
      [sourceMappingId(alternate.providerId, alternate.providerItemId), { provider: alternate.providerId, providerItemId: alternate.providerItemId, canonicalExternalId: 'different-series', matchedBy: 'source-map' }],
    ])
    const incoming = record('provider-c', 3, { vod_id: '303' })
    const resolution = resolveCanonicalIdentity([exact, alternate, incoming], mappings)
    expect(resolution.groups.get('one-piece')).toHaveLength(2)
    expect(resolution.groups.get('different-series')).toHaveLength(1)
    expect(resolution.ambiguousMatches).toBe(0)
  })

  it('merges the same episode into deterministic provider-priority sources', () => {
    const a = record()
    const b = record('provider-b', 2, { vod_id: '202', vod_play_from: 'line-b', vod_play_url: '1$https://b.example/1.m3u8' })
    const detail = mergeCanonicalAnime('one-piece', [b, a], 'exact-title').detail
    expect(detail.episodes[0].sources.map((source) => source.label)).toEqual(['Provider A · line-a', 'Provider B · line-b'])
  })

  it('preserves last-known sources from a provider absent from a partial run', () => {
    const detail = mergeCanonicalAnime('one-piece', [record()], 'source-map', {
      schemaVersion: 1, externalId: 'one-piece', title: 'One Piece', episodes: [{ episodeNumber: 1, sources: [{ label: 'Provider B · backup', url: 'https://b.example/1.m3u8', format: 'hls' }] }],
    }).detail
    expect(detail.episodes[0].sources.map((source) => source.label)).toContain('Provider B · backup')
  })

  it('never places playback URLs in the Firestore index', () => {
    const canonical = mergeCanonicalAnime('one-piece', [record()], 'deterministic-new')
    expect(JSON.stringify(canonical.index)).not.toContain('.m3u8')
    expect(JSON.stringify(canonical.detail)).toContain('.m3u8')
  })
})
