export class OfflineExerciseWriteError extends Error {
  constructor() {
    super('Exercise writes require an online connection.')
    this.name = 'OfflineExerciseWriteError'
  }
}

export function exerciseWriteErrorMessage(error: unknown): string {
  if (error instanceof OfflineExerciseWriteError) {
    return 'EdenOS is offline. This exercise draft has not been saved. Reconnect and try again.'
  }

  return 'Couldn’t save this exercise to Firestore. The draft is still available; try again.'
}
