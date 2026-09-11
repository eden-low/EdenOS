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

  if (action === 'create') {
    return 'Couldn’t save this expense to Firestore. The draft is still available; try again.'
  }
  if (action === 'update') {
    return 'Couldn’t update this expense in Firestore. Your edits are still available; try again.'
  }
  return 'Couldn’t delete this expense from Firestore. The record is unchanged; try again.'
}
