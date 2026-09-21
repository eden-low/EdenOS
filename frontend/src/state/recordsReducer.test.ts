import { describe, expect, it } from 'vitest'
import type { ExpenseDraft, ExpenseRecord, ExerciseDraft, ExerciseRecord } from '../types/records'
import { recordsReducer, type RecordsState } from './recordsReducer'

const at = '2026-09-17T10:00:00.000Z'
const expense: ExpenseRecord = {
  id: 'expense-1', amountSen: 1234, category: 'food', title: 'Lunch',
  occurredAt: at, createdAt: at, updatedAt: at, source: 'manual',
}
const exercise: ExerciseRecord = {
  id: 'exercise-1', activity: 'Walk', durationSeconds: 1800,
  occurredAt: at, createdAt: at, updatedAt: at, source: 'manual',
}
const initial: RecordsState = {
  expenses: [], incomes: [], exerciseRecords: [], drafts: [],
  expenseStatus: 'loading', expenseError: null,
  incomeStatus: 'loading', incomeError: null,
  exerciseStatus: 'loading', exerciseError: null,
}

describe('independent Records domains', () => {
  it.each([
    ['both loaded', false, false, 'loaded', 'loaded'],
    ['Expense failed', true, false, 'error', 'loaded'],
    ['Exercise failed', false, true, 'loaded', 'error'],
    ['both failed', true, true, 'error', 'error'],
  ] as const)('%s', (_label, expenseFailed, exerciseFailed, expenseStatus, exerciseStatus) => {
    let state = recordsReducer(initial, { type: 'expenses/loaded', expenses: [expense] })
    state = recordsReducer(state, { type: 'exercises/loaded', exercises: [exercise] })
    if (expenseFailed) state = recordsReducer(state, { type: 'expenses/failed', message: 'Expense failed' })
    if (exerciseFailed) state = recordsReducer(state, { type: 'exercises/failed', message: 'Exercise failed' })

    expect(state.expenseStatus).toBe(expenseStatus)
    expect(state.exerciseStatus).toBe(exerciseStatus)
    expect(state.expenseError).toBe(expenseFailed ? 'Expense failed' : null)
    expect(state.exerciseError).toBe(exerciseFailed ? 'Exercise failed' : null)
    expect(state.expenses).toEqual([expense])
    expect(state.exerciseRecords).toEqual([exercise])
  })

  it('treats loaded empty snapshots as successful and clears prior errors', () => {
    let state = recordsReducer(initial, { type: 'expenses/failed', message: 'Expense failed' })
    state = recordsReducer(state, { type: 'exercises/failed', message: 'Exercise failed' })
    state = recordsReducer(state, { type: 'expenses/loaded', expenses: [] })
    state = recordsReducer(state, { type: 'exercises/loaded', exercises: [] })
    expect(state).toMatchObject({
      expenses: [], exerciseRecords: [],
      expenseStatus: 'loaded', exerciseStatus: 'loaded',
      expenseError: null, exerciseError: null,
    })
  })
})

describe('session drafts', () => {
  it('updates and confirms only the matching draft without adding a record', () => {
    const expenseDraft: ExpenseDraft = {
      id: 'draft-expense', kind: 'expense', status: 'draft', data: expense,
      createdAt: at, updatedAt: at,
    }
    const exerciseDraft: ExerciseDraft = {
      id: 'draft-exercise', kind: 'exercise', status: 'draft', data: exercise,
      createdAt: at, updatedAt: at,
    }
    let state = recordsReducer(initial, { type: 'expenseDraft/created', draft: expenseDraft })
    state = recordsReducer(state, { type: 'exerciseDraft/created', draft: exerciseDraft })
    state = recordsReducer(state, {
      type: 'expenseDraft/updated', id: expenseDraft.id,
      data: { ...expense, amountSen: 2000, note: undefined }, updatedAt: at,
    })
    expect(state.drafts[0].data).toMatchObject({ amountSen: 2000 })
    state = recordsReducer(state, { type: 'expenseDraft/confirmed', draftId: expenseDraft.id })
    expect(state.drafts.map((draft) => draft.id)).toEqual([exerciseDraft.id])
    expect(state.expenses).toEqual([])
    expect(state.exerciseRecords).toEqual([])
  })
})
