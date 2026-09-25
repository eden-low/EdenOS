import { useContext } from 'react'
import { FinancePlanningContext } from './financePlanningContextDefinition'
export function useFinancePlanning() { const value = useContext(FinancePlanningContext); if (!value) throw new Error('useFinancePlanning must be used within FinancePlanningProvider'); return value }
