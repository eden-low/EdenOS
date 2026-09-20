import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchField } from './SearchField'

describe('SearchField', () => {
  it.each([
    '', 'Naruto', 'a deliberately long catalogue search query that must stay clear',
    '海贼王', '我独自升级和另一个很长的中文搜索内容',
  ])('keeps a stable control with reserved icon space for %j', (value) => {
    const { container } = render(<SearchField label="Search anime" placeholder="Search anime…" value={value} onChange={vi.fn()} onClear={vi.fn()} />)
    const input = screen.getByLabelText('Search anime')
    expect(input.classList.contains('search-field-control')).toBe(true)
    expect(container.querySelector('.search-field-icon')).not.toBeNull()
    expect(input.getAttribute('placeholder')).toBe('Search anime…')
    expect((input as HTMLInputElement).value).toBe(value)
    expect(Boolean(screen.queryByRole('button', { name: 'Clear search anime' }))).toBe(Boolean(value))
  })

  it('reports typing and clear actions without changing layout structure', () => {
    const change = vi.fn(); const clear = vi.fn()
    const { rerender } = render(<SearchField label="Search anime" placeholder="Search anime…" value="" onChange={change} onClear={clear} clearLabel="Clear anime search" />)
    fireEvent.change(screen.getByLabelText('Search anime'), { target: { value: '海贼王' } })
    expect(change).toHaveBeenCalledWith('海贼王')
    rerender(<SearchField label="Search anime" placeholder="Search anime…" value="海贼王" onChange={change} onClear={clear} clearLabel="Clear anime search" />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear anime search' }))
    expect(clear).toHaveBeenCalledOnce()
  })
})
