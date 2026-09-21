import { classifyFirebaseWriteError, logFirebaseWriteError } from './firebaseWriteError'

export class OfflineIncomeWriteError extends Error {
  constructor() {
    super('Reconnect before changing income records.')
    this.name = 'OfflineIncomeWriteError'
  }
}

export function incomeWriteErrorMessage(error: unknown, action: 'create' | 'update' | 'delete'): string {
  if (error instanceof OfflineIncomeWriteError) return error.message
  logFirebaseWriteError('income', action, error)
  if (classifyFirebaseWriteError(error) === 'not-found') return 'This income record no longer exists. Refresh and try again.'
  return `Could not ${action} income. Check your connection and try again.`
}
