import type {
  ExpenseData,
  ExpenseDraft,
  ExpenseRecord,
  ExerciseData,
  ExerciseDraft,
  ExerciseRecord,
  RecordDraft,
} from '../types/records'

export interface RecordsState {
  expenses: ExpenseRecord[]
  exerciseRecords: ExerciseRecord[]
  drafts: RecordDraft[]
  expenseStatus: 'loading' | 'loaded' | 'error'
  expenseError: string | null
  exerciseStatus: 'loading' | 'loaded' | 'error'
  exerciseError: string | null
}

export type RecordsAction =
  | { type: 'draft/discarded'; draftId: string }
  | { type: 'expenses/loading' }
  | { type: 'expenses/loaded'; expenses: ExpenseRecord[] }
  | { type: 'expenses/failed'; message: string }
  | { type: 'exercises/loading' }
  | { type: 'exercises/loaded'; exercises: ExerciseRecord[] }
  | { type: 'exercises/failed'; message: string }
  | { type: 'expenseDraft/created'; draft: ExpenseDraft }
  | { type: 'expenseDraft/updated'; id: string; data: ExpenseData; updatedAt: string }
  | { type: 'expenseDraft/confirmed'; draftId: string }
  | { type: 'exerciseDraft/created'; draft: ExerciseDraft }
  | { type: 'exerciseDraft/updated'; id: string; data: ExerciseData; updatedAt: string }
  | { type: 'exerciseDraft/confirmed'; draftId: string }

export function recordsReducer(state: RecordsState, action: RecordsAction): RecordsState {
  switch (action.type) {
    case 'draft/discarded':
      return {
        ...state,
        drafts: state.drafts.filter((draft) => draft.id !== action.draftId),
      }

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

    case 'exercises/loading':
      return { ...state, exerciseStatus: 'loading', exerciseError: null }

    case 'exercises/loaded':
      return {
        ...state,
        exerciseRecords: action.exercises,
        exerciseStatus: 'loaded',
        exerciseError: null,
      }

    case 'exercises/failed':
      return { ...state, exerciseStatus: 'error', exerciseError: action.message }

    case 'expenseDraft/created':
      return { ...state, drafts: [...state.drafts, action.draft] }

    case 'expenseDraft/updated':
      return {
        ...state,
        drafts: state.drafts.map((draft) =>
          draft.kind === 'expense' && draft.id === action.id
            ? { ...draft, data: action.data, updatedAt: action.updatedAt }
            : draft,
        ),
      }

    case 'expenseDraft/confirmed':
      return {
        ...state,
        drafts: state.drafts.filter(
          (item) => item.kind !== 'expense' || item.id !== action.draftId,
        ),
      }

    case 'exerciseDraft/created':
      return { ...state, drafts: [...state.drafts, action.draft] }

    case 'exerciseDraft/updated':
      return {
        ...state,
        drafts: state.drafts.map((draft) =>
          draft.kind === 'exercise' && draft.id === action.id
            ? { ...draft, data: action.data, updatedAt: action.updatedAt }
            : draft,
        ),
      }

    case 'exerciseDraft/confirmed':
      return {
        ...state,
        drafts: state.drafts.filter(
          (item) => item.kind !== 'exercise' || item.id !== action.draftId,
        ),
      }
  }
}
