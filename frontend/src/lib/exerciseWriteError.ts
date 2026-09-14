import { classifyFirebaseWriteError, logFirebaseWriteError } from './firebaseWriteError'

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

  logFirebaseWriteError('exercise', action, error)

  const kind = classifyFirebaseWriteError(error)
  if (kind === 'permission-denied') {
    if (action === 'create') {
      return 'This exercise could not be authorized. The draft has not been saved.'
    }
    if (action === 'update') {
      return 'This exercise update could not be authorized. Your edits are still available.'
    }
    return 'This exercise deletion could not be authorized. The record is unchanged.'
  }

  if (kind === 'not-found') {
    return 'This exercise no longer exists. It may have been removed elsewhere.'
  }

  if (kind === 'unavailable') {
    if (action === 'create') {
      return 'The cloud service is temporarily unavailable. This exercise draft is still available; try again.'
    }
    if (action === 'update') {
      return 'The cloud service is temporarily unavailable. Your exercise changes are still available; try again.'
    }
    return 'The cloud service is temporarily unavailable. This exercise has not been deleted; try again.'
  }

  if (action === 'create') {
    return 'Couldn’t save this exercise. The draft is still available; try again.'
  }
  if (action === 'update') {
    return 'Couldn’t update this exercise. Your edits are still available; try again.'
  }
  return 'Couldn’t delete this exercise. The record is unchanged; try again.'
}
