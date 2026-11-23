import { afterEach, describe, expect, it } from 'vitest'
import { appPageFromLocation, appPagePath, pushAppPage } from './appRoutes'

afterEach(() => window.history.replaceState(null, '', '/'))

describe('application routes', () => {
  it.each([
    ['/expenses', 'expenses'], ['/exercise', 'exercise'], ['/anime', 'anime'], ['/cosmos', 'cosmos'], ['/records', 'records'], ['/weekly-review', 'review'], ['/about', 'about'], ['/about/', 'about'], ['/about#interactive-eden', 'about'], ['/', 'today'],
  ])('recognizes clean path %s', (path, page) => {
    window.history.replaceState(null, '', path)
    expect(appPageFromLocation()).toBe(page)
  })

  it.each([
    ['/#/expenses', 'expenses'], ['/#/exercise', 'exercise'], ['/#/anime', 'anime'], ['/#/cosmos', 'cosmos'], ['/#/weekly-review', 'review'], ['/#/about', 'about'],
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

  it.each(['/expenses', '/exercise', '/records', '/weekly-review', '/anime', '/cosmos', '/about'])('keeps the canonical path authoritative over a stale root hash: %s', (path) => {
    window.history.replaceState(null, '', path)
    const expected = appPageFromLocation()
    window.history.replaceState(null, '', path + '#/')
    expect(appPageFromLocation()).toBe(expected)
  })

  it('falls back safely to Today for unknown paths', () => {
    window.history.replaceState(null, '', '/not-an-edenos-page')
    expect(appPageFromLocation()).toBe('today')
  })
  it.each(['/review','/review/','/review#/','/#/review'])('resolves the B2 review alias without changing canonical navigation: %s', path => {
    window.history.replaceState(null, '', path)
    expect(appPageFromLocation()).toBe('review')
    expect(appPagePath('review')).toBe('/weekly-review')
  })
})
