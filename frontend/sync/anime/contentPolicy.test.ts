import { describe, expect, it } from 'vitest'
import { animeContentGroupTargets, animeContentTargets, classifyAnimeContent, discoverAnimeCategoryPolicies, isCommentaryItem } from './contentPolicy'
import { vodItem } from './testFixtures'

const categories = discoverAnimeCategoryPolicies([
  { id: '29', parentId: '4', name: '国产动漫' },
  { id: '30', parentId: '4', name: '日韩动漫' },
  { id: '31', parentId: '4', name: '欧美动漫' },
  { id: '32', parentId: '4', name: '港台动漫' },
  { id: '33', parentId: '4', name: '海外动漫' },
  { id: '49', parentId: '1', name: '动画片' },
  { id: '4', parentId: '0', name: '动漫片' },
])

describe('Anime content policy', () => {
  it('discovers only the six approved provider categories', () => {
    expect(categories).toEqual(expect.arrayContaining([
      expect.objectContaining({ typeId: '29', fallbackRegion: 'china' }),
      expect.objectContaining({ typeId: '30', fallbackRegion: 'other' }),
      expect.objectContaining({ typeId: '31', fallbackRegion: 'europe_us' }),
      expect.objectContaining({ typeId: '32', group: 'hong_kong_taiwan_anime' }),
      expect.objectContaining({ typeId: '33', group: 'overseas_anime' }),
      expect.objectContaining({ typeId: '49', mediaType: 'movie' }),
    ]))
    expect(categories).toHaveLength(6)
  })

  it.each(['电影解说', '影视解说', '动漫解说', '动画解说'])('rejects %s category markers', (marker) => {
    expect(isCommentaryItem(vodItem({ vod_class: marker }))).toBe(true)
  })

  it.each(['片名[电影解说]', '片名【影视解说】', '[动漫解说]片名', '片名动画解说'])('rejects normalized title marker %s', (title) => {
    expect(isCommentaryItem(vodItem({ vod_name: title, vod_class: '动作' }))).toBe(true)
  })

  it.each(['侠盗猎车手6:加长版深度实机赏析', '影片赏析:某作品', '某作品剧情解析'])('rejects commentary and analysis title marker %s', (title) => {
    expect(isCommentaryItem(vodItem({ vod_name: title, vod_class: '动画' }))).toBe(true)
  })

  it('does not reject a legitimate title because its description contains 解说', () => {
    expect(isCommentaryItem(vodItem({ vod_name: '葬送的芙莉莲', vod_class: '奇幻', vod_content: '角色解说内容' }))).toBe(false)
  })

  it('does not reject a legitimate Anime whose title contains similar ordinary words', () => {
    expect(isCommentaryItem(vodItem({ vod_name: '名侦探柯南国语版', vod_class: '动作,推理' }))).toBe(false)
  })

  it('normalizes Japanese, Chinese, and Western Anime into existing regions', () => {
    expect(classifyAnimeContent(vodItem({ type_id: 30, type_name: '日韩动漫', vod_area: '日本' }), categories)).toMatchObject({ accepted: true, region: 'japan' })
    expect(classifyAnimeContent(vodItem({ type_id: 29, type_name: '国产动漫', vod_area: '中国大陆' }), categories)).toMatchObject({ accepted: true, region: 'china' })
    expect(classifyAnimeContent(vodItem({ type_id: 31, type_name: '欧美动漫', vod_area: '美国' }), categories)).toMatchObject({ accepted: true, region: 'europe_us' })
  })

  it('includes Korean and ambiguous 日韩 entries without labelling them Japanese', () => {
    expect(classifyAnimeContent(vodItem({ type_id: 30, type_name: '日韩动漫', vod_area: '韩国' }), categories)).toMatchObject({ accepted: true, region: 'korea' })
    expect(classifyAnimeContent(vodItem({ type_id: 30, type_name: '日韩动漫', vod_area: '日韩' }), categories)).toMatchObject({ accepted: true, region: 'other' })
  })

  it('normalizes Hong Kong/Taiwan, overseas Anime, and animation movies', () => {
    expect(classifyAnimeContent(vodItem({ type_id: 32, type_name: '港台动漫', vod_area: '' }), categories)).toMatchObject({ accepted: true, region: 'hong_kong_taiwan', mediaType: 'anime' })
    expect(classifyAnimeContent(vodItem({ type_id: 33, type_name: '海外动漫', vod_area: '' }), categories)).toMatchObject({ accepted: true, region: 'other', mediaType: 'anime' })
    expect(classifyAnimeContent(vodItem({ type_id: 49, type_name: '动画片', vod_area: '美国' }), categories)).toMatchObject({ accepted: true, region: 'europe_us', mediaType: 'movie', requiredGenres: ['Animation'] })
  })

  it('rejects generic Anime category labels and parses bounded targets', () => {
    expect(classifyAnimeContent(vodItem({ type_id: 4, type_name: '动漫片', vod_area: '日本' }), categories)).toMatchObject({ accepted: false, reason: 'category-not-allowed' })
    expect(animeContentTargets('japan:300,china:200,europe_us:100')).toEqual({ japan: 300, china: 200, europe_us: 100 })
    expect(() => animeContentTargets('japan:500,china:200,europe_us:100')).toThrow('650')
    expect(animeContentGroupTargets('china_anime:2200,east_asia_anime:5000,western_anime:1400,hong_kong_taiwan_anime:100,overseas_anime:200,animation_movie:100')).toMatchObject({ east_asia_anime: 5000, animation_movie: 100 })
    expect(() => animeContentGroupTargets('east_asia_anime:9501')).toThrow('9500')
  })
})
