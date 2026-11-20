import { act, cleanup, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppPage } from '../layout/Navigation'
import { createExerciseAvatarEntries, exerciseAvatarSessionKey } from './exerciseAvatarEntry'
import { useExerciseAvatarEntry } from './useExerciseAvatarEntry'

afterEach(cleanup)
function memory(initial?: string) {
  const values = new Map<string, string>(initial === undefined ? [] : [[exerciseAvatarSessionKey, initial]])
  return { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value) }) }
}
function fixture(storage = memory(), owner = 'tab-one') {
  return { storage, entries: createExerciseAvatarEntries(() => ({ storage, owner })) }
}

describe('Exercise entry parity, independent of rendering and data', () => {
  it('alternates correctly for twenty real page entries, ignoring repeated observations', () => {
    const { storage, entries } = fixture()
    for (let index = 0; index < 20; index++) {
      entries.observe(index % 2 ? 'records' : 'today')
      const expected = index % 2 ? 'eden-boxing' : 'eden-swim'
      expect(entries.observe('exercise')).toBe(expected)
      for (let duplicate = 0; duplicate < 5; duplicate++) expect(entries.observe('exercise')).toBe(expected)
      expect(entries.peek('exercise')).toBe(expected)
      expect(entries.peek('records')).toBeNull()
    }
    expect(storage.setItem).toHaveBeenCalledTimes(20)
    expect(storage.setItem.mock.calls.every(([key]) => key === exerciseAvatarSessionKey)).toBe(true)
  })
  it('consumes exactly one next form per new document/reload with the same tab owner', () => {
    const storage = memory()
    for (const expected of ['eden-swim', 'eden-boxing', 'eden-swim', 'eden-boxing']) {
      const { entries } = fixture(storage)
      expect(entries.observe('exercise')).toBe(expected)
      expect(entries.observe('exercise')).toBe(expected)
    }
    expect(storage.setItem).toHaveBeenCalledTimes(4)
  })
  it('starts a fresh tab at Swim even when its sessionStorage was copied from an opener', () => {
    const parent = fixture()
    expect(parent.entries.observe('exercise')).toBe('eden-swim')
    const child = fixture(memory(parent.storage.getItem(exerciseAvatarSessionKey)!), 'tab-two')
    expect(child.entries.observe('exercise')).toBe('eden-swim')
    child.entries.observe('records')
    expect(child.entries.observe('exercise')).toBe('eden-boxing')
    parent.entries.observe('today')
    expect(parent.entries.observe('exercise')).toBe('eden-boxing')
    expect(parent.storage.setItem).toHaveBeenCalledTimes(2)
  })
  it.each(['bad-json', 'null', '[]', '{}', '{"version":2,"owner":"tab-one","next":"eden-boxing"}', '{"version":1,"owner":"tab-one","next":"other"}'])('recovers %s to Swim, then resumes deterministic alternation', (raw) => {
    const { entries } = fixture(memory(raw))
    expect(entries.observe('exercise')).toBe('eden-swim')
    entries.observe('today')
    expect(entries.observe('exercise')).toBe('eden-boxing')
  })
  it.each(['access', 'read', 'write'])('falls back to fixed Swim when storage %s fails', (failure) => {
    const storage = memory('{"version":1,"owner":"tab-one","next":"eden-boxing"}')
    if (failure === 'read') storage.getItem.mockImplementation(() => { throw new Error('Denied') })
    if (failure === 'write') storage.setItem.mockImplementation(() => { throw new Error('Quota') })
    const entries = createExerciseAvatarEntries(() => {
      if (failure === 'access') throw new Error('Blocked')
      return { storage, owner: 'tab-one' }
    })
    for (let i = 0; i < 3; i++) { expect(entries.observe('exercise')).toBe('eden-swim'); entries.observe('today') }
  })
  it('does not mutate storage on initialization, peek or non-Exercise pages', () => {
    const { entries, storage } = fixture()
    entries.peek('exercise'); entries.observe('today'); entries.observe('about'); entries.observe('records')
    expect(storage.getItem).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })
})

it('commits once in Strict Mode and stays fixed through rerenders, events, remounts and page-local interactions', () => {
  const { entries, storage } = fixture()
  function Probe({ page, tick = 0 }: { page: AppPage; tick?: number }) {
    const form = useExerciseAvatarEntry(page, entries)
    return <output>{form ?? 'none'}:{tick}</output>
  }
  const tree = (page: AppPage, tick = 0) => <StrictMode><Probe page={page} tick={tick} /></StrictMode>
  const view = render(tree('exercise'))
  expect(screen.getByText('eden-swim:0')).toBeTruthy()
  for (let tick = 1; tick <= 4; tick++) view.rerender(tree('exercise', tick))
  act(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
  expect(screen.getByText('eden-swim:4')).toBeTruthy()
  expect(storage.setItem).toHaveBeenCalledTimes(1)
  view.unmount()
  const remount = render(tree('exercise'))
  expect(screen.getByText('eden-swim:0')).toBeTruthy()
  expect(storage.setItem).toHaveBeenCalledTimes(1)
  remount.rerender(tree('records'))
  remount.rerender(tree('exercise'))
  expect(screen.getByText('eden-boxing:0')).toBeTruthy()
  expect(storage.setItem).toHaveBeenCalledTimes(2)
})
