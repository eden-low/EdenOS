import { describe, expect, it } from 'vitest'
import { matchingDestinations, parseCommand } from './command'

const now = new Date('2026-09-26T10:22:30.000Z')

describe('EdenOS commands', () => {
  it('creates reviewed Finance candidates without persistence', () => {
    expect(parseCommand('Add expense RM18 lunch', now)).toEqual({ kind: 'expense', data: { amountSen: 1800, category: 'food', title: 'lunch', occurredAt: '2026-09-26T10:22:00.000Z', source: 'text' } })
    expect(parseCommand('Add income 2500 salary', now)).toEqual({ kind: 'income', data: { amountSen: 250000, category: 'salary', description: 'salary', occurredAt: '2026-09-26T10:22:00.000Z' } })
  })

  it('recognizes exercise capture, navigation, and Anime fallback', () => {
    expect(parseCommand('Log running', now)).toEqual({ kind: 'exercise', activity: 'Running' })
    expect(parseCommand('Weekly review', now)).toMatchObject({ kind: 'navigation', page: 'review' })
    expect(parseCommand('Frieren', now)).toEqual({ kind: 'anime-search', query: 'Frieren' })
    expect(matchingDestinations('exp')).toEqual([{ page: 'expenses', label: 'Finance' }])
  })
})
