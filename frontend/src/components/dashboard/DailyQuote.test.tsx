import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { DailyQuote } from './DailyQuote'

beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('keeps Today content available while the public quote request is pending', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
  render(<><DailyQuote referenceDate={new Date(2026, 8, 17)} /><p>Monthly Spending</p></>)
  expect(screen.getByText('Monthly Spending')).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Daily quote' })).toBeTruthy()
})

it('renders a compact quote with safe source attribution', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    uuid: '75a45fd4-4f2f-45eb-80cb-6f0a7bcdfaf2',
    hitokoto: 'A little room to think.', type: 'd', from: 'A book', from_who: null, length: 23,
  }) })))
  render(<DailyQuote referenceDate={new Date(2026, 8, 18)} />)
  await waitFor(() => expect(screen.getByText('“A little room to think.”')).toBeTruthy())
  const link = screen.getByRole('link', { name: '— A book' })
  expect(link.getAttribute('href')).toContain('uuid=75a45fd4-4f2f-45eb-80cb-6f0a7bcdfaf2')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
})

it('omits attribution when the API supplies no author or source', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    uuid: '75a45fd4-4f2f-45eb-80cb-6f0a7bcdfaf2',
    hitokoto: 'Take a breath.', type: 'e', from: null, from_who: null, length: 14,
  }) })))
  render(<DailyQuote referenceDate={new Date(2026, 8, 19)} />)
  await waitFor(() => expect(screen.getByText('“Take a breath.”')).toBeTruthy())
  expect(screen.queryByRole('link')).toBeNull()
})
