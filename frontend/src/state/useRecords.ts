import { useContext } from 'react'
import { RecordsContext, type RecordsContextValue } from './recordsContextDefinition'

export function useRecords(): RecordsContextValue {
  const context = useContext(RecordsContext)
  if (!context) throw new Error('useRecords must be used within RecordsProvider')
  return context
}
