import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AboutPage } from './AboutPage'

afterEach(cleanup)
describe('About Eden content', () => {
  it('includes the five requested areas and explicit personal-information placeholders', () => {
    render(<AboutPage />)
    for (const heading of ['About Eden', 'Who Am I', 'My EdenOS Story', 'My Interests', 'Interactive Eden']) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
    }
    expect(screen.getByText('My Little Universe')).toBeTruthy()
    expect(screen.getByText('Personal introduction · to be added')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(3)
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
