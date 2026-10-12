import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { calculateDateOnlyNatal, calculateExactNatal } from './astrologyAdapter'
import { NatalChartWheel } from './NatalChartWheel'

describe('accessible natal chart wheel', () => {
  it('renders real planet, house, Ascendant, MC, and aspect geometry for an exact chart', () => {
    const { container } = render(<NatalChartWheel chart={calculateExactNatal(Date.parse('2000-01-01T00:00:00Z'), { latitude: 51.4769, longitude: 0 })} />)
    expect(screen.getByRole('img', { name: /^本命盘圆盘 \/ Natal chart wheel/ })).toBeTruthy()
    expect(container.querySelectorAll('.astrology-zodiac-glyph')).toHaveLength(12)
    expect(container.querySelectorAll('.astrology-house-boundary')).toHaveLength(12)
    expect(container.querySelectorAll('.astrology-planet-marker')).toHaveLength(10)
    expect(container.querySelector('.is-asc')).toBeTruthy()
    expect(container.querySelector('.is-mc')).toBeTruthy()
    expect(container.querySelectorAll('.astrology-aspect-lines line').length).toBeGreaterThan(0)
  })

  it('shows a reduced reference wheel without fabricated chart geometry for unknown time', () => {
    const { container } = render(<NatalChartWheel chart={calculateDateOnlyNatal('2024-01-03', 'Asia/Kuala_Lumpur')} />)
    expect(screen.getByRole('img', { name: /^黄道十二宫参考圆盘 \/ Zodiac reference wheel/ })).toBeTruthy()
    expect(container.querySelectorAll('.astrology-planet-marker')).toHaveLength(0)
    expect(container.querySelectorAll('.astrology-house-boundary')).toHaveLength(0)
    expect(screen.getByText('时间未知')).toBeTruthy()
  })
})
