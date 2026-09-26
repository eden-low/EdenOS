import { useContext } from 'react'
import { FinanceRulesContext, type FinanceRulesContextValue } from './financeRulesContextDefinition'

export function useFinanceRules(): FinanceRulesContextValue {
  const value = useContext(FinanceRulesContext)
  if (!value) throw new Error('useFinanceRules must be used within FinanceRulesProvider')
  return value
}
