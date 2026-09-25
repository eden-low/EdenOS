import type { FinanceRule, FinanceRuleData } from '../types/finance'
export interface FinanceRuleRepository {
  subscribe(observer: { next: (rules: FinanceRule[]) => void; error: (error: unknown) => void }): () => void
  create(id: string, data: FinanceRuleData): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
  delete(id: string): Promise<void>
}
