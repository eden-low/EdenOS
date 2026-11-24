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
    expect(screen.getByText('个人介绍')).toBeTruthy()
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
  it('renders the owner-approved biography as three distinct paragraphs', () => {
    render(<AboutPage />)
    const paragraphs = [...document.querySelectorAll('.about-biography > p')].map(p => p.textContent)
    expect(paragraphs).toEqual([
      '我是一名刚毕业的 Business Information Systems 学生。',
      '我对数字工具、生活系统和有温度的设计很有兴趣，也喜欢把看起来零散的事情整理成更清楚、更舒服的样子。',
      'EdenOS 是我留给自己的一个空间，用来记录生活、整理节奏，也慢慢认识现在的自己。',
    ])
    expect(screen.getByText('嗨，我是 Eden。')).toBeTruthy()
    expect(screen.queryByText(/待 Eden 补充/)).toBeNull()
  })
  it('restores the document title on leaving About', () => {
    document.title = 'EdenOS'
    const view = render(<AboutPage />)
    expect(document.title).toBe('About Eden · EdenOS')
    view.unmount()
    expect(document.title).toBe('EdenOS')
  })
})
