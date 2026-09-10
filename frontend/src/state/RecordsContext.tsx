import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { mockExerciseRecords } from '../data/mockRecords'
import { createFirestoreExpenseRepository } from '../repositories/firestoreExpenseRepository'
import type { ExpenseDraft } from '../types/records'
import { RecordsContext, type RecordsContextValue } from './recordsContextDefinition'
import { recordsReducer, type RecordsState } from './recordsReducer'
import { useFirebaseAuth } from './useFirebaseAuth'

function createId(prefix: string): string {
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}-${uniquePart}`
}

function createInitialState(): RecordsState {
  return {
    expenses: [],
    exerciseRecords: mockExerciseRecords.map((record) => ({ ...record })),
    drafts: [],
    expenseStatus: 'loading',
    expenseError: null,
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth()
  const [subscriptionVersion, setSubscriptionVersion] = useState(0)
  const [state, dispatch] = useReducer(recordsReducer, undefined, createInitialState)
  const expenseRepository = useMemo(
    () => createFirestoreExpenseRepository(firestore, uid),
    [firestore, uid],
  )

  useEffect(() => {
    dispatch({ type: 'expenses/loading' })
    return expenseRepository.subscribeExpenses({
      next(expenses) {
        dispatch({ type: 'expenses/loaded', expenses })
      },
      error() {
        dispatch({
          type: 'expenses/failed',
          message: 'EdenOS could not load your Firebase expense records. Check Firestore and its Security Rules, then try again.',
        })
      },
    })
  }, [expenseRepository, subscriptionVersion])

  const value = useMemo<RecordsContextValue>(
    () => ({
      ...state,
      createExpenseDraft(data) {
        const now = new Date().toISOString()
        const draft: ExpenseDraft = {
          id: createId('draft'),
          kind: 'expense',
          status: 'draft',
          data,
          createdAt: now,
          updatedAt: now,
        }
        dispatch({ type: 'expenseDraft/created', draft })
        return draft.id
      },
      updateExpenseDraft(id, data) {
        dispatch({ type: 'expenseDraft/updated', id, data, updatedAt: new Date().toISOString() })
      },
      async confirmExpenseDraft(id) {
        const draft = state.drafts.find((item) => item.id === id)
        if (!draft) throw new Error('Expense draft no longer exists.')

        await expenseRepository.createExpense(draft.data)
        dispatch({ type: 'expenseDraft/confirmed', draftId: id })
      },
      async updateExpense(id, data) {
        await expenseRepository.updateExpense(id, data)
      },
      async deleteExpense(id) {
        await expenseRepository.deleteExpense(id)
      },
    }),
    [expenseRepository, state],
  )

  if (state.expenseStatus === 'loading') {
    return (
      <AppStatusScreen
        status="loading"
        title="Syncing your records"
        message="Loading your confirmed expenses from Firestore…"
      />
    )
  }

  if (state.expenseStatus === 'error') {
    return (
      <AppStatusScreen
        status="error"
        title="Records are unavailable"
        message={state.expenseError ?? 'EdenOS could not load your expense records.'}
        onRetry={() => setSubscriptionVersion((version) => version + 1)}
      />
    )
  }

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}
