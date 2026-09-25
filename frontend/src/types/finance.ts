import type { ExpenseCategory, ExpenseRecord, IncomeCategory, IncomeRecord } from './records'

export type FinanceRuleDirection = 'expense' | 'income'
export type FinanceRuleMatchType = 'exact' | 'contains'
export type FinanceRuleCategory = ExpenseCategory | IncomeCategory

export interface FinanceRuleData {
  direction: FinanceRuleDirection
  matchType: FinanceRuleMatchType
  pattern: string
  category: FinanceRuleCategory
  enabled: boolean
}

export interface FinanceRule extends FinanceRuleData {
  id: string
  createdAt: number
  updatedAt: number
}

export interface FinanceRuleSuggestion extends FinanceRuleData {
  sampleCount: number
  displayPattern: string
}

export type FinanceRuleSourceRecord = ExpenseRecord | IncomeRecord
