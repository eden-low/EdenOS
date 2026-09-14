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
  const [subscriptionVersion, setSubscriptionVersion] = useState(0)
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
          message: 'EdenOS could not load your Firebase expense records. Check Firestore and its Security Rules, then try again.',
        })
      },
    })
  }, [expenseRepository, subscriptionVersion])

  useEffect(() => {
    dispatch({ type: 'exercises/loading' })
    return exerciseRepository.subscribeExercises({
      next(exercises) {
        dispatch({ type: 'exercises/loaded', exercises })
      },
      error() {
        dispatch({
          type: 'exercises/failed',
          message: 'EdenOS could not load your Firebase exercise records. Check Firestore and its Security Rules, then try again.',
        })
      },
    })
  }, [exerciseRepository, subscriptionVersion])

  const value = useMemo<RecordsContextValue>(
    () => ({
      ...state,
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

  if (state.expenseStatus === 'loading') {
    if (connectivity === 'offline') {
      return (
        <AppStatusScreen
          status="offline"
          title="Cloud records are unavailable offline"
          message="The EdenOS app shell is ready, but this browser has no loaded Firestore expense snapshot. Reconnect to load your records."
        />
      )
    }

    return (
      <AppStatusScreen
        status="loading"
        title="Syncing your records"
        message="Loading your confirmed expenses from Firestore…"
      />
    )
  }

  if (state.expenseStatus === 'error') {
    if (connectivity === 'offline') {
      return (
        <AppStatusScreen
          status="offline"
          title="Cloud records are unavailable offline"
          message="Reconnect to Firebase, then retry loading your confirmed expense records."
        />
      )
    }

    return (
      <AppStatusScreen
        status="error"
        title="Records are unavailable"
        message={state.expenseError ?? 'EdenOS could not load your expense records.'}
        onRetry={() => setSubscriptionVersion((version) => version + 1)}
      />
    )
  }

  if (state.exerciseStatus === 'loading') {
    if (connectivity === 'offline') {
      return (
        <AppStatusScreen
          status="offline"
          title="Cloud records are unavailable offline"
          message="The EdenOS app shell is ready, but this browser has no loaded Firestore exercise snapshot. Reconnect to load your records."
        />
      )
    }

    return (
      <AppStatusScreen
        status="loading"
        title="Syncing your records"
        message="Loading your confirmed exercises from Firestore…"
      />
    )
  }

  if (state.exerciseStatus === 'error') {
    if (connectivity === 'offline') {
      return (
        <AppStatusScreen
          status="offline"
          title="Cloud records are unavailable offline"
          message="Reconnect to Firebase, then retry loading your confirmed exercise records."
        />
      )
    }

    return (
      <AppStatusScreen
        status="error"
        title="Records are unavailable"
        message={state.exerciseError ?? 'EdenOS could not load your exercise records.'}
        onRetry={() => setSubscriptionVersion((version) => version + 1)}
      />
    )
  }

  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>
}
