import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cosmosReflectionForLocalDate } from '../../cosmos/dailyReflections'
import { CosmosTodayCard } from './CosmosTodayCard'

describe('CosmosTodayCard', () => {
  it('renders the local daily reflection and clearly labels its scope', () => {
    const referenceDate = new Date(2026, 9, 12, 18, 30)
    render(<CosmosTodayCard referenceDate={referenceDate} onOpen={vi.fn()} />)
    expect(screen.getByText(cosmosReflectionForLocalDate(referenceDate).text)).toBeTruthy()
    expect(screen.getByText('每日反思提示 · 不是星座运势或历法推算')).toBeTruthy()
  })

  it('opens Cosmos through the supplied application navigation', () => {
    const onOpen = vi.fn()
    render(<CosmosTodayCard referenceDate={new Date(2026, 9, 12)} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Cosmos' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
