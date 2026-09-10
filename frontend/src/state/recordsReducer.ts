import type { ExpenseData, ExpenseDraft, ExpenseRecord, ExerciseRecord } from '../types/records'

export interface RecordsState {
  expenses: ExpenseRecord[]
  exerciseRecords: ExerciseRecord[]
  drafts: ExpenseDraft[]
  expenseStatus: 'loading' | 'loaded' | 'error'
  expenseError: string | null
}

export type RecordsAction =
  | { type: 'expenses/loading' }
  | { type: 'expenses/loaded'; expenses: ExpenseRecord[] }
  | { type: 'expenses/failed'; message: string }
  | { type: 'expenseDraft/created'; draft: ExpenseDraft }
  | { type: 'expenseDraft/updated'; id: string; data: ExpenseData; updatedAt: string }
  | { type: 'expenseDraft/confirmed'; draftId: string }

export function recordsReducer(state: RecordsState, action: RecordsAction): RecordsState {
  switch (action.type) {
    case 'expenses/loading':
      return { ...state, expenseStatus: 'loading', expenseError: null }

    case 'expenses/loaded':
      return {
        ...state,
        expenses: action.expenses,
        expenseStatus: 'loaded',
        expenseError: null,
      }

    case 'expenses/failed':
      return { ...state, expenseStatus: 'error', expenseError: action.message }

    case 'expenseDraft/created':
      return { ...state, drafts: [...state.drafts, action.draft] }

    case 'expenseDraft/updated':
      return {
        ...state,
        drafts: state.drafts.map((draft) =>
          draft.id === action.id
            ? { ...draft, data: action.data, updatedAt: action.updatedAt }
            : draft,
        ),
      }

    case 'expenseDraft/confirmed':
      return {
        ...state,
        drafts: state.drafts.filter((item) => item.id !== action.draftId),
      }
  }
}
