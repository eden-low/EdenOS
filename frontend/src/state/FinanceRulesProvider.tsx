import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createFirestoreFinanceRuleRepository } from '../repositories/firestoreFinanceRuleRepository'
import type { FinanceRule } from '../types/finance'
import { FinanceRulesContext } from './financeRulesContextDefinition'
import { useFirebaseAuth } from './useFirebaseAuth'

function createId(): string {
  return `rule-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`
}

export function FinanceRulesProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreFinanceRuleRepository(firestore, uid), [firestore, uid])
  const [state, setState] = useState<{ uid: string; rules: FinanceRule[]; status: 'loading' | 'loaded' | 'error' }>({ uid, rules: [], status: 'loading' })
  useEffect(() => repository.subscribe({
    next: (rules) => setState({ uid, rules, status: 'loaded' }),
    error: () => setState({ uid, rules: [], status: 'error' }),
  }), [repository, uid])
  const current = state.uid === uid ? state : { uid, rules: [], status: 'loading' as const }
  return <FinanceRulesContext.Provider value={{
    rules: current.rules,
    status: current.status,
    createRule: (data) => repository.create(createId(), data),
    setRuleEnabled: repository.setEnabled,
    deleteRule: repository.delete,
  }}>{children}</FinanceRulesContext.Provider>
}
