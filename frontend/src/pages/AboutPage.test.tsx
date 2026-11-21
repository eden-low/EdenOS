import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AboutPage } from './AboutPage'

afterEach(cleanup)
describe('About Eden content', () => {
  it('preserves the original five areas and inserts the wardrobe before the footer', () => {
    render(<AboutPage />)
    for (const heading of ['About Eden', '关于我', 'EdenOS 的故事', '我的兴趣', 'Interactive Eden · 互动小 Eden']) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    }
    expect(screen.getByText('My Little Universe · 我的小宇宙')).toBeTruthy()
    expect(screen.getByText('个人介绍 · 待 Eden 补充')).toBeTruthy()
    expect(document.querySelector('.about-page')?.getAttribute('lang')).toBe('zh-CN')
    expect(screen.getByRole('button', { name: '微笑' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '思考' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '挥手' })).toBeTruthy()
    expect(screen.getByRole('img', { name: '可互动的 Q 版 Eden 人物' })).toBeTruthy()
    expect(document.querySelectorAll('.about-gesture-button')).toHaveLength(3)
    expect(screen.getByRole('heading', { name: '我的 13 种小宇宙' })).toBeTruthy()
    const wardrobe = document.querySelector('#eden-wardrobe')!
    expect(wardrobe.previousElementSibling?.id).toBe('interactive-eden')
    expect(wardrobe.nextElementSibling?.tagName).toBe('FOOTER')
    expect(screen.getByRole('link', { name: '小 Eden 的衣橱' }).getAttribute('href')).toBe('#eden-wardrobe')
    expect(document.querySelector('.eden-avatar')).toBeNull()
    expect(document.querySelector('a[href^="https://"]')).toBeNull()
  })
  it('restores the document title on leaving About', () => {
    document.title = 'EdenOS'
    const view = render(<AboutPage />)
    expect(document.title).toBe('About Eden · EdenOS')
    view.unmount()
    expect(document.title).toBe('EdenOS')
  })
})
