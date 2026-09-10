import type { ExpenseData, ExpenseDraft, ExpenseRecord, ExerciseRecord } from '../types/records'

export interface RecordsState {
  expenses: ExpenseRecord[]
  exerciseRecords: ExerciseRecord[]
  drafts: ExpenseDraft[]
}

export type RecordsAction =
  | { type: 'expenseDraft/created'; draft: ExpenseDraft }
  | { type: 'expenseDraft/updated'; id: string; data: ExpenseData; updatedAt: string }
  | { type: 'expenseDraft/confirmed'; draftId: string; recordId: string; confirmedAt: string }
  | { type: 'expense/updated'; id: string; data: ExpenseData; updatedAt: string }
  | { type: 'expense/deleted'; id: string }

export function recordsReducer(state: RecordsState, action: RecordsAction): RecordsState {
  switch (action.type) {
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

    case 'expenseDraft/confirmed': {
      const draft = state.drafts.find((item) => item.id === action.draftId)
      if (!draft) return state

      const record: ExpenseRecord = {
        ...draft.data,
        id: action.recordId,
        createdAt: draft.createdAt,
        updatedAt: action.confirmedAt,
      }

      return {
        ...state,
        expenses: [record, ...state.expenses],
        drafts: state.drafts.filter((item) => item.id !== action.draftId),
      }
    }

    case 'expense/updated':
      return {
        ...state,
        expenses: state.expenses.map((expense) =>
          expense.id === action.id
            ? { ...expense, ...action.data, updatedAt: action.updatedAt }
            : expense,
        ),
      }

    case 'expense/deleted':
      return {
        ...state,
        expenses: state.expenses.filter((expense) => expense.id !== action.id),
      }
  }
}
