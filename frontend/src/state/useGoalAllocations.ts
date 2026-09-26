import { useEffect, useMemo, useState } from 'react'
import { createFirestoreFinancePlanningRepository } from '../repositories/firestoreFinancePlanningRepository'
import type { FinanceGoalAllocation } from '../types/finance'
import { useFirebaseAuth } from './useFirebaseAuth'

export function useGoalAllocations(month: Date) {
  const { firestore, uid } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreFinancePlanningRepository(firestore, uid), [firestore, uid])
  const year = month.getFullYear(); const monthIndex = month.getMonth(); const key = `${uid}:${year}-${monthIndex}`
  const [state, setState] = useState<{ key: string; values: FinanceGoalAllocation[]; status: 'loading' | 'loaded' | 'error' }>({ key, values: [], status: 'loading' })
  useEffect(() => repository.subscribeAllocations(new Date(year, monthIndex, 1), new Date(year, monthIndex + 1, 1), {
    next: (values) => setState({ key, values, status: 'loaded' }), error: () => setState({ key, values: [], status: 'error' }),
  }), [key, monthIndex, repository, year])
  return state.key === key ? { allocations: state.values, status: state.status } : { allocations: [], status: 'loading' as const }
}
