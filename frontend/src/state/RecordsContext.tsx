import {
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { mockExpenseRecords, mockExerciseRecords } from '../data/mockRecords'
import { recordStorage } from '../services/recordStorage'
import type { ExpenseDraft } from '../types/records'
import { RecordsContext, type RecordsContextValue } from './recordsContextDefinition'
import { recordsReducer, type RecordsState } from './recordsReducer'

function createId(prefix: string): string {
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  return `${prefix}-${uniquePart}`
}

function createInitialState(): RecordsState {
  return {
    expenses: recordStorage.loadExpenses(mockExpenseRecords),
    exerciseRecords: mockExerciseRecords.map((record) => ({ ...record })),
    drafts: [],
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(recordsReducer, undefined, createInitialState)

  useEffect(() => {
    recordStorage.saveExpenses(state.expenses)
  }, [state.expenses])

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
      confirmExpenseDraft(id) {
        dispatch({
          type: 'expenseDraft/confirmed',
          draftId: id,
          recordId: createId('expense'),
          confirmedAt: new Date().toISOString(),
        })
      },
      updateExpense(id, data) {
        dispatch({ type: 'expense/updated', id, data, updatedAt: new Date().toISOString() })
      },
      deleteExpense(id) {
        dispatch({ type: 'expense/deleted', id })
      },
    }),
    [state],
  )

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}
