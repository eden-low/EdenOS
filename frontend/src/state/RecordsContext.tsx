import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { AppStatusScreen } from '../components/layout/AppStatusScreen'
import { OfflineExerciseWriteError } from '../lib/exerciseWriteError'
import { OfflineExpenseWriteError } from '../lib/expenseWriteError'
import { useConnectivity } from '../providers/useConnectivity'
import { createFirestoreExerciseRepository } from '../repositories/firestoreExerciseRepository'
import { createFirestoreExpenseRepository } from '../repositories/firestoreExpenseRepository'
import type { ExpenseDraft, ExerciseDraft } from '../types/records'
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
    exerciseRecords: [],
    drafts: [],
    expenseStatus: 'loading',
    expenseError: null,
    exerciseStatus: 'loading',
    exerciseError: null,
  }
}

export function RecordsProvider({ children }: { children: ReactNode }) {
  const { firestore, uid } = useFirebaseAuth()
  const connectivity = useConnectivity()
  const [expenseSubscriptionVersion, setExpenseSubscriptionVersion] = useState(0)
  const [exerciseSubscriptionVersion, setExerciseSubscriptionVersion] = useState(0)
  const [state, dispatch] = useReducer(recordsReducer, undefined, createInitialState)
  const expenseRepository = useMemo(
    () => createFirestoreExpenseRepository(firestore, uid),
    [firestore, uid],
  )
  const exerciseRepository = useMemo(
    () => createFirestoreExerciseRepository(firestore, uid),
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
          message: 'Expense records are temporarily unavailable.',
        })
      },
    })
  }, [expenseRepository, expenseSubscriptionVersion])

  useEffect(() => {
    dispatch({ type: 'exercises/loading' })
    return exerciseRepository.subscribeExercises({
      next(exercises) {
        dispatch({ type: 'exercises/loaded', exercises })
      },
      error() {
        dispatch({
          type: 'exercises/failed',
          message: 'Exercise records are temporarily unavailable.',
        })
      },
    })
  }, [exerciseRepository, exerciseSubscriptionVersion])

  const value = useMemo<RecordsContextValue>(
    () => ({
      ...state,
      retryExpenseSubscription() {
        setExpenseSubscriptionVersion((version) => version + 1)
      },
      retryExerciseSubscription() {
        setExerciseSubscriptionVersion((version) => version + 1)
      },
      discardDraft(id) {
        dispatch({ type: 'draft/discarded', draftId: id })
      },
      createExpenseDraft(data) {
        const now = new Date().toISOString()
        const draft: ExpenseDraft = {
          id: createId('expense'),
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
        const draft = state.drafts.find(
          (item): item is ExpenseDraft => item.kind === 'expense' && item.id === id,
        )
        if (!draft) throw new Error('Expense draft no longer exists.')
        if (connectivity === 'offline') throw new OfflineExpenseWriteError()

        await expenseRepository.createExpense(draft.id, draft.data)
        dispatch({ type: 'expenseDraft/confirmed', draftId: id })
      },
      async updateExpense(id, data) {
        if (connectivity === 'offline') throw new OfflineExpenseWriteError()
        await expenseRepository.updateExpense(id, data)
      },
      async deleteExpense(id) {
        if (connectivity === 'offline') throw new OfflineExpenseWriteError()
        await expenseRepository.deleteExpense(id)
      },
      createExerciseDraft(data) {
        const now = new Date().toISOString()
        const draft: ExerciseDraft = {
          id: createId('exercise'),
          kind: 'exercise',
          status: 'draft',
          data,
          createdAt: now,
          updatedAt: now,
        }
        dispatch({ type: 'exerciseDraft/created', draft })
        return draft.id
      },
      updateExerciseDraft(id, data) {
        dispatch({ type: 'exerciseDraft/updated', id, data, updatedAt: new Date().toISOString() })
      },
      async confirmExerciseDraft(id) {
        const draft = state.drafts.find(
          (item): item is ExerciseDraft => item.kind === 'exercise' && item.id === id,
        )
        if (!draft) throw new Error('Exercise draft no longer exists.')
        if (connectivity === 'offline') throw new OfflineExerciseWriteError()

        await exerciseRepository.createExercise(draft.id, draft.data)
        dispatch({ type: 'exerciseDraft/confirmed', draftId: id })
      },
      async updateExercise(id, data) {
        if (connectivity === 'offline') throw new OfflineExerciseWriteError()
        await exerciseRepository.updateExercise(id, data)
      },
      async deleteExercise(id) {
        if (connectivity === 'offline') throw new OfflineExerciseWriteError()
        await exerciseRepository.deleteExercise(id)
      },
    }),
    [connectivity, exerciseRepository, expenseRepository, state],
  )

  if (state.expenseStatus === 'loading' && state.exerciseStatus === 'loading') {
    if (connectivity === 'offline') {
      return (
        <AppStatusScreen
          status="offline"
          title="Cloud records are unavailable offline"
          message="The EdenOS app shell is ready, but this browser has no loaded cloud record snapshot. Reconnect to load your records."
        />
      )
    }

    return (
      <AppStatusScreen
        status="loading"
        title="Syncing your records"
        message="Loading your confirmed records from the cloud…"
      />
    )
  }

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}
