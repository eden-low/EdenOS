export type ExerciseWriteAction = 'create' | 'update' | 'delete'

export class OfflineExerciseWriteError extends Error {
  constructor() {
    super('Exercise writes require an online connection.')
    this.name = 'OfflineExerciseWriteError'
  }
}

export function exerciseWriteErrorMessage(
  error: unknown,
  action: ExerciseWriteAction,
): string {
  if (error instanceof OfflineExerciseWriteError) {
    if (action === 'create') {
      return 'EdenOS is offline. This exercise draft has not been saved. Reconnect and try again.'
    }
    if (action === 'update') {
      return 'EdenOS is offline. Your exercise changes have not been saved. Reconnect and try again.'
    }
    return 'EdenOS is offline. This exercise has not been deleted. Reconnect and try again.'
  }

  if (action === 'create') {
    return 'Couldn’t save this exercise to Firestore. The draft is still available; try again.'
  }
  if (action === 'update') {
    return 'Couldn’t update this exercise in Firestore. Your edits are still available; try again.'
  }
  return 'Couldn’t delete this exercise from Firestore. The record is unchanged; try again.'
}
