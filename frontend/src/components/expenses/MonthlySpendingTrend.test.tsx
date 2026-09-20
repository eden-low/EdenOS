import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'
import type { MonthlySpendingTrend as MonthlySpendingTrendData } from '../../selectors/monthlySpendingTrend'
import { MonthlySpendingTrend } from './MonthlySpendingTrend'

const trend: MonthlySpendingTrendData = {
  currentMonthLabel: 'September 2026',
  previousMonthLabel: 'August 2026',
  current: [{ day: 1, cumulativeSen: 1250 }, { day: 2, cumulativeSen: 1250 }, { day: 3, cumulativeSen: 2500 }],
  previous: [{ day: 1, cumulativeSen: 900 }, { day: 2, cumulativeSen: 1000 }, { day: 3, cumulativeSen: 1200 }],
}

describe('MonthlySpendingTrend', () => {
  it('renders a responsive, token-themed chart with an accessible two-series summary', () => {
    const { container } = render(<MonthlySpendingTrend trend={trend} />)
    const chart = screen.getByRole('img', { name: 'Monthly cumulative spending line chart' })
    expect(chart.getAttribute('data-chart-theme')).toBe('tokens')
    expect(chart.getAttribute('class')).toContain('overflow-hidden')
    expect(screen.getByText(/September 2026 cumulative spending through day 3: RM 25/)).toBeTruthy()
    expect(screen.getByText(/August 2026 through the same day: RM 12/)).toBeTruthy()
    expect(container.querySelectorAll('polyline[stroke="var(--accent-primary)"]')).toHaveLength(2)
    expect(container.querySelectorAll('polyline[stroke="var(--text-muted)"]')).toHaveLength(2)
    expect(container.querySelector('svg[viewBox="0 0 360 220"]')).toBeTruthy()
    expect(container.querySelector('svg[viewBox="0 0 720 220"]')).toBeTruthy()
  })

  it('uses the same design tokens in light and dark theme modes', () => {
    const { container, rerender } = render(<div data-theme="light"><MonthlySpendingTrend trend={trend} /></div>)
    expect(container.querySelector('[data-theme="light"] [data-chart-theme="tokens"]')).toBeTruthy()
    expect(container.querySelector('line')?.getAttribute('stroke')).toBe('var(--border-subtle)')
    rerender(<div data-theme="dark"><MonthlySpendingTrend trend={trend} /></div>)
    expect(container.querySelector('[data-theme="dark"] [data-chart-theme="tokens"]')).toBeTruthy()
    expect(container.querySelector('line')?.getAttribute('stroke')).toBe('var(--border-subtle)')
  })

  it('emits no chart amounts while locked and restores the chart after unlock', () => {
    const requestUnlock = vi.fn()
    const { rerender } = render(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, requestUnlock }}><MonthlySpendingTrend trend={trend} /></PrivacyLockContext.Provider>)
    expect(screen.getByText('Unlock to view spending trend')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Monthly cumulative spending line chart' })).toBeNull()
    expect(screen.queryByText(/RM 25/)).toBeNull()
    expect(document.body.textContent).not.toContain('2500')
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(requestUnlock).toHaveBeenCalledOnce()

    rerender(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true }}><MonthlySpendingTrend trend={trend} /></PrivacyLockContext.Provider>)
    expect(screen.getByRole('img', { name: 'Monthly cumulative spending line chart' })).toBeTruthy()
    expect(screen.getAllByText(/RM 25/).length).toBeGreaterThan(0)
  })

  it('renders only the current series when previous-month data is absent', () => {
    const { container } = render(<MonthlySpendingTrend trend={{ ...trend, previous: null }} />)
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(screen.queryByText('August 2026')).toBeNull()
  })
})
