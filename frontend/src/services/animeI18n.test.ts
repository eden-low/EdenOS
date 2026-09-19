import { describe, expect, it } from 'vitest'
import { animeText, detectAnimeLocale } from './animeI18n'

describe('Anime-scoped localization', () => {
  it('selects Chinese for a Chinese browser language', () => {
    expect(detectAnimeLocale(['zh-MY', 'en'])).toBe('zh')
    expect(animeText('zh', 'tracking')).toBe('追踪')
  })
  it('defaults to English for other browser languages', () => {
    expect(detectAnimeLocale(['ms-MY', 'en-US'])).toBe('en')
    expect(animeText('en', 'watching')).toBe('Watching')
  })
})
