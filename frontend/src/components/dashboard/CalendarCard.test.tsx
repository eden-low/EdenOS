import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarCard } from './CalendarCard'

describe('CalendarCard', () => {
  it('renders the current month, highlights today, and navigates without a backend', () => {
    render(<CalendarCard referenceDate={new Date(2026, 8, 21, 12)} />)
    expect(screen.getByRole('heading', { name: 'September 2026' })).toBeTruthy()
    expect(screen.getByText('21').getAttribute('aria-current')).toBe('date')
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: 'August 2026' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeTruthy()
  })
})
