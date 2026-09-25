import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { goalsWithLegacyCompatibility } from '../domain/financePlanning'
import { createFirestoreFinancePlanningRepository } from '../repositories/firestoreFinancePlanningRepository'
import type { FinanceBudget, FinanceGoal } from '../types/finance'
import { FinancePlanningContext } from './financePlanningContextDefinition'
import { useFirebaseAuth } from './useFirebaseAuth'
import { useUserSettings } from './useUserSettings'

function createId(prefix: string): string { return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}` }

export function FinancePlanningProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth(); const { settings } = useUserSettings()
  const repository = useMemo(() => createFirestoreFinancePlanningRepository(firestore, uid), [firestore, uid])
  const [goalsState, setGoalsState] = useState<{ uid: string; values: FinanceGoal[]; status: 'loading' | 'loaded' | 'error' }>({ uid, values: [], status: 'loading' })
  const [budgetsState, setBudgetsState] = useState<{ uid: string; values: FinanceBudget[]; status: 'loading' | 'loaded' | 'error' }>({ uid, values: [], status: 'loading' })
  useEffect(() => repository.subscribeGoals({ next: (values) => setGoalsState({ uid, values, status: 'loaded' }), error: () => setGoalsState({ uid, values: [], status: 'error' }) }), [repository, uid])
  useEffect(() => repository.subscribeBudgets({ next: (values) => setBudgetsState({ uid, values, status: 'loaded' }), error: () => setBudgetsState({ uid, values: [], status: 'error' }) }), [repository, uid])
  const goalsCurrent = goalsState.uid === uid ? goalsState : { uid, values: [], status: 'loading' as const }
  const budgetsCurrent = budgetsState.uid === uid ? budgetsState : { uid, values: [], status: 'loading' as const }
  const goals = goalsWithLegacyCompatibility(goalsCurrent.values, settings)
  return <FinancePlanningContext.Provider value={{
    goals,
    budgets: budgetsCurrent.values,
    status: goalsCurrent.status === 'error' || budgetsCurrent.status === 'error' ? 'error' : goalsCurrent.status === 'loaded' && budgetsCurrent.status === 'loaded' ? 'loaded' : 'loading',
    createGoal: (data, initial) => repository.createGoal(createId('goal'), data, initial),
    updateGoal: repository.updateGoal,
    setGoalArchived: (goal, archived) => repository.updateGoal(goal, { name: goal.name, targetAmountSen: goal.targetAmountSen, targetDate: goal.targetDate?.slice(0, 10) ?? null, status: archived ? 'archived' : 'active' }),
    contributeToGoal: (goal, amount, occurredAt) => repository.contribute(goal, amount, occurredAt, createId('allocation')),
    createBudget: (data) => repository.createBudget(createId('budget'), data),
    updateBudget: (budget, data) => repository.updateBudget(budget.id, data),
    setBudgetArchived: (budget, archived) => repository.updateBudget(budget.id, { name: budget.name, monthlyAmountSen: budget.monthlyAmountSen, category: budget.category, status: archived ? 'archived' : 'active' }),
  }}>{children}</FinancePlanningContext.Provider>
}
