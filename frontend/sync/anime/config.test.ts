import { describe, expect, it } from 'vitest'
import { loadProviderConfigs, parseSyncOptions, selectProviderConfigs } from './config'

describe('Anime sync configuration', () => {
  it('loads an ordered multi-provider registry without hardcoded URLs', () => {
    const configs = loadProviderConfigs({
      ANIME_SYNC_PROVIDERS: 'b,a',
      ANIME_PROVIDER_A_BASE_URL: 'https://a.example',
      ANIME_PROVIDER_A_DISPLAY_NAME: 'Provider A',
      ANIME_PROVIDER_A_PRIORITY: '1',
      ANIME_PROVIDER_B_BASE_URL: 'https://b.example',
      ANIME_PROVIDER_B_PRIORITY: '2',
    })
    expect(configs.map((config) => config.id)).toEqual(['a', 'b'])
    expect(configs[0].displayName).toBe('Provider A')
  })

  it('supports a typed JSON registry for manual CI runs', () => {
    const configs = loadProviderConfigs({ ANIME_SYNC_PROVIDER_CONFIG_JSON: JSON.stringify([
      { id: 'provider-a', displayName: 'Provider A', baseUrl: 'https://a.example', priority: 2 },
    ]) })
    expect(configs[0]).toMatchObject({ id: 'provider-a', displayName: 'Provider A', priority: 2 })
  })

  it('parses safe CLI modes, limits, replay, and probes', () => {
    expect(parseSyncOptions(['--mode=full', '--dry-run', '--providers=a,b', '--limit=50', '--from-cache=.cache/run', '--probe-media', '--content-targets=japan:30,china:20,europe_us:10', '--cleanup=plan'])).toMatchObject({
      mode: 'full', dryRun: true, providerIds: ['a', 'b'], limit: 50, fromCache: '.cache/run', probeMedia: true,
      contentTargets: { japan: 30, china: 20, europe_us: 10 }, cleanup: 'plan',
    })
  })

  it('rejects unconfigured requested providers', () => {
    expect(() => selectProviderConfigs([], ['missing'])).toThrow('not configured')
  })

  it('parses broad catalogue group targets and prevents mixed target modes', () => {
    expect(parseSyncOptions(['--content-groups=china_anime:250,east_asia_anime:550,western_anime:150,hong_kong_taiwan_anime:20,overseas_anime:20,animation_movie:10'])).toMatchObject({
      contentGroupTargets: { china_anime: 250, east_asia_anime: 550, western_anime: 150, hong_kong_taiwan_anime: 20, overseas_anime: 20, animation_movie: 10 },
    })
    expect(() => parseSyncOptions(['--content-targets=japan:1', '--content-groups=east_asia_anime:1'])).toThrow('either')
  })

  it('uses explicit operation budgets and controlled checkpoint options', () => {
    expect(parseSyncOptions([
      '--controlled',
      '--max-titles=100',
      '--max-firestore-writes=12000',
      '--max-firestore-reads=30000',
      '--operation-safety-margin=100',
      '--checkpoint-id=canary-v1',
      '--catalogue-stats',
      '--verify-idempotency',
    ], {})).toMatchObject({
      controlled: true,
      maxTitles: 100,
      maxFirestoreWrites: 12_000,
      maxFirestoreReads: 30_000,
      operationSafetyMargin: 100,
      checkpointId: 'canary-v1',
      catalogueStats: true,
      verifyIdempotency: true,
    })
    expect(() => parseSyncOptions(['--max-firestore-writes=100', '--operation-safety-margin=100'], {})).toThrow('smaller')
  })
})
