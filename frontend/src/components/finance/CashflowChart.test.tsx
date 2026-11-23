import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CashflowChart } from './CashflowChart'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'

describe('Cashflow readable presentation', () => {
  it('keeps monetary/date labels outside SVG scaling and preserves the accessible data summary', () => {
    const data = [{ day: 1, incomeSen: 10000, expenseSen: 0 }, { day: 30, incomeSen: 10000, expenseSen: 2500 }]
    const { container } = render(<CashflowChart data={data} monthLabel="November 2026" />)
    expect(screen.getByRole('img', { name: 'Cumulative income and expense line chart' }).getAttribute('aria-describedby')).toBe('cashflow-description')
    expect(container.querySelector('#cashflow-description')?.textContent).toContain('cumulative income RM 100 and cumulative expenses RM 25')
    expect(container.querySelectorAll('svg text')).toHaveLength(0)
    expect(Array.from(container.querySelectorAll('.cashflow-y-axis span')).map(e => e.textContent)).toEqual(['RM 100', 'RM 50', 'RM 0'])
    expect(Array.from(container.querySelectorAll('.cashflow-x-axis span')).map(e => e.textContent)).toEqual(['Day 1', 'Day 15', 'Day 30'])
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(data[1]).toEqual({ day: 30, incomeSen: 10000, expenseSen: 2500 })
  })
  it('keeps the empty state and the locked state free of trend values', () => {
    const { rerender, container } = render(<CashflowChart data={[]} monthLabel="November 2026" />)
    expect(screen.getByText('No finance activity this month')).toBeTruthy()
    rerender(<PrivacyLockContext.Provider value={{ ...unlockedPrivacyLock, enabled: true, locked: true, requestUnlock: vi.fn() }}><CashflowChart data={[{ day: 1, incomeSen: 10000, expenseSen: 2500 }]} monthLabel="November 2026" /></PrivacyLockContext.Provider>)
    expect(screen.getByText('Unlock to view finance trend')).toBeTruthy()
    expect(container.querySelectorAll('polyline,.cashflow-axis-label')).toHaveLength(0)
    expect(container.textContent).not.toContain('RM 100')
  })
})
