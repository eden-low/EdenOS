import { createContext } from 'react'
import type { FinanceRule, FinanceRuleData } from '../types/finance'

export interface FinanceRulesContextValue {
  rules: FinanceRule[]
  status: 'loading' | 'loaded' | 'error'
  createRule(data: FinanceRuleData): Promise<void>
  setRuleEnabled(id: string, enabled: boolean): Promise<void>
  deleteRule(id: string): Promise<void>
}

export const FinanceRulesContext = createContext<FinanceRulesContextValue | null>(null)
