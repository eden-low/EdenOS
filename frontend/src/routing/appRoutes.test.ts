import { afterEach, describe, expect, it } from 'vitest'
import { appPageFromLocation, appPagePath, pushAppPage } from './appRoutes'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('application routes', () => {
  it.each([
    ['/expenses', 'expenses'], ['/exercise', 'exercise'], ['/anime', 'anime'], ['/records', 'records'], ['/weekly-review', 'review'], ['/', 'today'],
  ])('recognizes clean path %s', (path, page) => {
    window.history.replaceState(null, '', path)
    expect(appPageFromLocation()).toBe(page)
  })

  it.each([
    ['/#/expenses', 'expenses'], ['/#/exercise', 'exercise'], ['/#/anime', 'anime'], ['/#/weekly-review', 'review'],
  ])('preserves hash-route compatibility for %s', (path, page) => {
    window.history.replaceState(null, '', path)
    expect(appPageFromLocation()).toBe(page)
  })

  it('pushes canonical clean paths without changing the routing model elsewhere', () => {
    pushAppPage('records')
    expect(window.location.pathname).toBe('/records')
    expect(window.location.hash).toBe('')
    expect(appPagePath('review')).toBe('/weekly-review')
  })

  it('falls back safely to Today for unknown paths', () => {
    window.history.replaceState(null, '', '/not-an-edenos-page')
    expect(appPageFromLocation()).toBe('today')
  })
})
