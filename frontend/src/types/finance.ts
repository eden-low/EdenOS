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

export type FinancePlanStatus = 'active' | 'archived'

export interface FinanceGoalData {
  name: string
  targetAmountSen: number
  targetDate: string | null
  status: FinancePlanStatus
}

export interface FinanceGoal extends FinanceGoalData {
  id: string
  allocatedAmountSen: number
  createdAt: number
  updatedAt: number
  source: 'stored' | 'legacy'
}

export interface FinanceBudgetData {
  name: string
  monthlyAmountSen: number
  category: ExpenseCategory | null
  status: FinancePlanStatus
}

export interface FinanceBudget extends FinanceBudgetData {
  id: string
  createdAt: number
  updatedAt: number
}

export interface FinanceGoalAllocation {
  id: string
  goalId: string
  amountSen: number
  occurredAt: string
  createdAt: number
}
