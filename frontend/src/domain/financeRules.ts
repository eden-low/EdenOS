import type { FinanceRule, FinanceRuleCategory, FinanceRuleDirection, FinanceRuleSuggestion } from '../types/finance'
import type { ExpenseRecord, IncomeRecord } from '../types/records'

export const financeRuleSuggestionThreshold = 3

export function normalizeFinancePattern(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function matchingFinanceRule(text: string, direction: FinanceRuleDirection, rules: FinanceRule[]): FinanceRule | null {
  const normalized = normalizeFinancePattern(text)
  if (!normalized) return null
  return rules.find((rule) => rule.enabled && rule.direction === direction && (
    rule.matchType === 'exact' ? normalized === normalizeFinancePattern(rule.pattern) : normalized.includes(normalizeFinancePattern(rule.pattern))
  )) ?? null
}

export function suggestFinanceRules(
  expenses: ExpenseRecord[],
  incomes: IncomeRecord[],
  existingRules: FinanceRule[],
  threshold = financeRuleSuggestionThreshold,
): FinanceRuleSuggestion[] {
  const groups = new Map<string, { direction: FinanceRuleDirection; category: FinanceRuleCategory; pattern: string; displayPattern: string; count: number }>()
  const add = (direction: FinanceRuleDirection, displayPattern: string, category: FinanceRuleCategory) => {
    const pattern = normalizeFinancePattern(displayPattern)
    if (!pattern) return
    const key = `${direction}:${pattern}:${category}`
    const group = groups.get(key)
    groups.set(key, group ? { ...group, count: group.count + 1 } : { direction, category, pattern, displayPattern: displayPattern.trim(), count: 1 })
  }
  expenses.forEach((record) => add('expense', record.title, record.category))
  incomes.forEach((record) => add('income', record.description, record.category))
  return [...groups.values()]
    .filter((group) => group.count >= threshold)
    .filter((group) => !existingRules.some((rule) => rule.direction === group.direction && normalizeFinancePattern(rule.pattern) === group.pattern))
    .map((group) => ({ direction: group.direction, matchType: 'exact' as const, pattern: group.pattern, displayPattern: group.displayPattern, category: group.category, enabled: true, sampleCount: group.count }))
    .sort((left, right) => right.sampleCount - left.sampleCount || left.pattern.localeCompare(right.pattern))
}
