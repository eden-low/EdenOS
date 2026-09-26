import { describe, expect, it } from 'vitest'
import type { FinanceRule } from '../types/finance'
import type { ExpenseRecord } from '../types/records'
import { financeRuleSuggestionThreshold, matchingFinanceRule, normalizeFinancePattern, suggestFinanceRules } from './financeRules'

const expense = (id: string, title: string, category: ExpenseRecord['category']): ExpenseRecord => ({ id, title, category, amountSen: 100, occurredAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', source: 'manual' })
const rule = (overrides: Partial<FinanceRule> = {}): FinanceRule => ({ id: 'rule', direction: 'expense', matchType: 'exact', pattern: 'mcdonald s', category: 'food', enabled: true, createdAt: 1, updatedAt: 1, ...overrides })

describe('Finance rules', () => {
  it('normalizes merchant text and supports exact or user-created contains matching', () => {
    expect(normalizeFinancePattern("  McDonald's  ")).toBe('mcdonald s')
    expect(matchingFinanceRule("McDonald's", 'expense', [rule()])?.category).toBe('food')
    expect(matchingFinanceRule('PETRONAS AMPANG', 'expense', [rule({ matchType: 'contains', pattern: 'petronas', category: 'transport' })])?.category).toBe('transport')
    expect(matchingFinanceRule('PETRONAS', 'expense', [rule({ enabled: false, pattern: 'petronas' })])).toBeNull()
  })

  it('suggests but never creates a rule after the configurable consistency threshold', () => {
    const records = Array.from({ length: financeRuleSuggestionThreshold }, (_, index) => expense(String(index), "McDonald's", 'food'))
    expect(suggestFinanceRules(records, [], [])).toEqual([expect.objectContaining({ pattern: 'mcdonald s', category: 'food', sampleCount: financeRuleSuggestionThreshold })])
    expect(suggestFinanceRules(records.slice(1), [], [])).toEqual([])
    expect(suggestFinanceRules(records, [], [rule()])).toEqual([])
  })
})
