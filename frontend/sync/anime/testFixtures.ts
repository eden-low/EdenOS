import type { AnimeProviderConfig, MacCmsVodItem } from './types'

export function providerConfig(overrides: Partial<AnimeProviderConfig> = {}): AnimeProviderConfig {
  return {
    id: 'provider-a',
    displayName: 'Provider A',
    baseUrl: new URL('https://provider.example/'),
    priority: 1,
    timeoutMs: 10_000,
    maxRetries: 2,
    ...overrides,
  }
}

export function vodItem(overrides: Partial<MacCmsVodItem> = {}): MacCmsVodItem {
  return {
    vod_id: '101',
    vod_name: 'One Piece',
    vod_pic: 'https://images.example/one-piece.jpg',
    vod_year: '1999',
    vod_area: '日本',
    vod_class: '动作,冒险,动漫',
    vod_remarks: '更新至2集',
    vod_content: '<p>A pirate &amp; his crew.</p>',
    vod_time: '2026-09-18 12:00:00',
    vod_score: '8.8',
    vod_play_from: 'line-a',
    vod_play_url: '第01集$https://media.example/1.m3u8#EP02$https://media.example/2.mp4',
    type_name: '动漫',
    ...overrides,
  }
}

export function envelope(items: MacCmsVodItem[] = [vodItem()], overrides: Record<string, unknown> = {}) {
  return { code: 1, msg: 'ok', page: 1, pagecount: 1, limit: 20, total: items.length, list: items, ...overrides }
}
