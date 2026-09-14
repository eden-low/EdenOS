import { classifyFirebaseWriteError, logFirebaseWriteError } from './firebaseWriteError'

export type ExpenseWriteAction = 'create' | 'update' | 'delete'

export class OfflineExpenseWriteError extends Error {
  constructor() {
    super('Expense writes require an online connection.')
    this.name = 'OfflineExpenseWriteError'
  }
}

export function expenseWriteErrorMessage(
  error: unknown,
  action: ExpenseWriteAction,
): string {
  if (error instanceof OfflineExpenseWriteError) {
    if (action === 'create') {
      return 'EdenOS is offline. This draft has not been saved. Reconnect and try again.'
    }
    if (action === 'update') {
      return 'EdenOS is offline. Your changes have not been saved. Reconnect and try again.'
    }
    return 'EdenOS is offline. This expense has not been deleted. Reconnect and try again.'
  }

  logFirebaseWriteError('expense', action, error)

  const kind = classifyFirebaseWriteError(error)
  if (kind === 'permission-denied') {
    if (action === 'create') {
      return 'This expense could not be authorized. The draft has not been saved.'
    }
    if (action === 'update') {
      return 'This expense update could not be authorized. Your edits are still available.'
    }
    return 'This expense deletion could not be authorized. The record is unchanged.'
  }

  if (kind === 'not-found') {
    return 'This expense no longer exists. It may have been removed elsewhere.'
  }

  if (kind === 'unavailable') {
    if (action === 'create') {
      return 'The cloud service is temporarily unavailable. This expense draft is still available; try again.'
    }
    if (action === 'update') {
      return 'The cloud service is temporarily unavailable. Your expense changes are still available; try again.'
    }
    return 'The cloud service is temporarily unavailable. This expense has not been deleted; try again.'
  }

  if (action === 'create') {
    return 'Couldn’t save this expense. The draft is still available; try again.'
  }
  if (action === 'update') {
    return 'Couldn’t update this expense. Your edits are still available; try again.'
  }
  return 'Couldn’t delete this expense. The record is unchanged; try again.'
}
