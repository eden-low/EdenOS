export type AnimeLocale = 'en' | 'zh'

const copy = {
  en: {
    anime: 'Anime', tracking: 'Tracking', watching: 'Watching', completed: 'Completed',
    recentlyWatching: 'Recently Watching', search: 'Search anime…', filters: 'Filters',
    all: 'All', loadMore: 'Load more', retry: 'Retry', addAnime: 'Add Anime',
    noResults: 'No catalogue titles match these choices.', noTracking: 'Nothing here yet.',
    contentUnavailable: 'Anime content is not configured yet.', episodes: 'Episodes', sources: 'Sources',
    previous: 'Previous episode', next: 'Next episode', continue: 'Continue', save: 'Save', cancel: 'Cancel',
    currentEpisode: 'Current episode', status: 'Status', playerError: 'Playback is unavailable for this source.',
    loaded: 'Loaded', of: 'of', catalogueError: 'The Anime catalogue could not load.',
    subtitle: 'Your media library, playback, and progress.', library: 'Library', catalogue: 'Catalogue',
    movie: 'Movie', tvSeries: 'TV Series', documentary: 'Documentary', airing: 'Airing',
    allRegions: 'All regions', allGenres: 'All genres', allStatuses: 'All statuses', anyYear: 'Any year',
    region: 'Region', genre: 'Genre', year: 'Year', clearSearch: 'Clear search', loading: 'Loading…',
    episode: 'Episode', onlinePlayer: 'Online player and episode progress', detailsError: 'Anime details could not load.',
    playbackSource: 'Playback source', hlsUnsupported: 'HLS playback is not supported in this browser.',
    hlsFailed: 'The HLS stream could not continue.', hlsLoadFailed: 'The HLS player could not load.',
    mediaFailed: 'The media could not be decoded or loaded.', cloudFailed: 'Cloud watch progress is temporarily unavailable.',
    searchCatalogue: 'Search catalogue', chooseCatalogue: 'Choose an existing catalogue title and its current episode.',
    searchFailed: 'Search is temporarily unavailable.', current: 'Current', playerAndEpisodes: 'Player and episodes',
  },
  zh: {
    anime: '动漫', tracking: '追踪', watching: '观看中', completed: '已完成',
    recentlyWatching: '最近观看', search: '搜索动漫…', filters: '筛选',
    all: '全部', loadMore: '加载更多', retry: '重试', addAnime: '添加动漫',
    noResults: '没有符合当前条件的作品。', noTracking: '这里还没有内容。',
    contentUnavailable: '动漫内容尚未配置。', episodes: '剧集', sources: '播放源',
    previous: '上一集', next: '下一集', continue: '继续观看', save: '保存', cancel: '取消',
    currentEpisode: '当前集数', status: '状态', playerError: '此播放源目前无法播放。',
    loaded: '已加载', of: '/', catalogueError: '动漫目录暂时无法加载。',
    subtitle: '你的媒体库、在线播放与观看进度。', library: '媒体库', catalogue: '目录',
    movie: '电影', tvSeries: '电视剧', documentary: '纪录片', airing: '连载中',
    allRegions: '全部地区', allGenres: '全部类型', allStatuses: '全部状态', anyYear: '全部年份',
    region: '地区', genre: '类型', year: '年份', clearSearch: '清除搜索', loading: '加载中…',
    episode: '第', onlinePlayer: '在线播放与剧集进度', detailsError: '无法加载动漫详情。',
    playbackSource: '播放源', hlsUnsupported: '此浏览器不支持 HLS 播放。',
    hlsFailed: 'HLS 串流无法继续播放。', hlsLoadFailed: '无法加载 HLS 播放器。',
    mediaFailed: '媒体无法解码或加载。', cloudFailed: '云端观看进度暂时不可用。',
    searchCatalogue: '搜索目录', chooseCatalogue: '从目录选择作品并输入当前集数。',
    searchFailed: '搜索暂时不可用。', current: '当前', playerAndEpisodes: '播放器与剧集',
  },
} as const

export type AnimeCopyKey = keyof typeof copy.en

export function detectAnimeLocale(languages: readonly string[] = typeof navigator === 'undefined' ? ['en'] : navigator.languages): AnimeLocale {
  return languages.some((language) => language.toLocaleLowerCase().startsWith('zh')) ? 'zh' : 'en'
}

export function useAnimeText(): (key: AnimeCopyKey) => string {
  const locale = detectAnimeLocale()
  return useMemo(() => (key: AnimeCopyKey) => animeText(locale, key), [locale])
}

export function animeText(locale: AnimeLocale, key: AnimeCopyKey): string {
  return copy[locale][key]
}
import { useMemo } from 'react'
