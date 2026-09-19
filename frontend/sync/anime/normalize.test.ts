import { describe, expect, it } from 'vitest'
import { animeFilterKeysForIngestion, normalizeAnimeTitle } from '../../src/domain/anime'
import { classifyPlaybackUrl, cleanText, fallbackEpisodeNumber, normalizeGenres, normalizeMediaType, normalizeProviderAnime, normalizeRegion, normalizeStatus, parseEpisodeNumber, parsePlayback } from './normalize'
import { providerConfig, vodItem } from './testFixtures'

describe('Anime sync normalization', () => {
  it('shares frontend title normalization semantics', () => {
    const { record } = normalizeProviderAnime(vodItem({ vod_name: '  ＯＮＥ   Piece  ' }), providerConfig())
    expect(record.titleNormalized).toBe(normalizeAnimeTitle('  ＯＮＥ   Piece  '))
    expect(record.titleNormalized).toBe('one piece')
  })

  it('strips HTML and decodes entities without executing markup', () => {
    expect(cleanText('<script>alert(1)</script><p>A &amp; B</p>')).toBe('A & B')
  })

  it('normalizes explicit media, region, status, and genre vocabularies', () => {
    expect(normalizeMediaType(vodItem({ type_name: '纪录片' }))).toBe('documentary')
    expect(normalizeMediaType(vodItem({ type_name: '电影' }))).toBe('movie')
    expect(normalizeRegion('香港 / 台湾')).toBe('hong_kong_taiwan')
    expect(normalizeStatus('全12集完结')).toBe('completed')
    expect(normalizeGenres('动作 科幻 恋爱')).toEqual(['Action', 'Romance', 'Sci-Fi'])
  })

  it('parses numeric episode labels and keeps nonnumeric labels outside the normal range', () => {
    expect(['1', '01', 'EP01', 'E01', '第1集', '第01话'].map(parseEpisodeNumber)).toEqual([1, 1, 1, 1, 1, 1])
    expect(parseEpisodeNumber('Special')).toBeNull()
    expect(fallbackEpisodeNumber('Special')).toBeGreaterThanOrEqual(1_000_000)
  })

  it('parses MacCMS playback groups and classifies direct media only', () => {
    const parsed = parsePlayback(vodItem({
      vod_play_from: 'hls$$$backup',
      vod_play_url: '第1集$https://a.example/1.m3u8#SP$https://a.example/special.mp4$$$1$https://watch.example/page',
    }))
    expect(parsed.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ episodeNumber: 1, groupLabel: 'hls', format: 'hls' }),
      expect.objectContaining({ groupLabel: 'hls', format: 'mp4' }),
    ]))
    expect(parsed.unsupported).toBe(1)
    expect(classifyPlaybackUrl('javascript:alert(1)')).toBeNull()
    expect(classifyPlaybackUrl('https://watch.example/share')).toBeNull()
  })

  it('normalizes missing optional fields without dropping the title', () => {
    const { record } = normalizeProviderAnime(vodItem({ vod_pic: null, vod_year: null, vod_area: null, vod_content: null, vod_score: null }), providerConfig())
    expect(record).toMatchObject({ title: 'One Piece', coverUrl: '', genres: ['Action', 'Adventure'], status: 'airing' })
    expect(record.year).toBeUndefined()
  })

  it('produces the exact frontend filter-key contract', () => {
    const { record } = normalizeProviderAnime(vodItem(), providerConfig())
    expect(record.year).toBe(1999)
    expect(animeFilterKeysForIngestion(record)).not.toContain('genre:fantasy')
    expect(animeFilterKeysForIngestion(record)).toContain('genre:action|mediaType:anime|region:japan|status:airing|year:1999')
  })
})
