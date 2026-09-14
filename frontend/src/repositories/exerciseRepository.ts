import type { ExerciseData, ExerciseRecord } from '../types/records'

export interface ExerciseSubscriptionObserver {
  next: (exercises: ExerciseRecord[]) => void
  error: (error: unknown) => void
}

export interface ExerciseRepository {
  subscribeExercises: (observer: ExerciseSubscriptionObserver) => () => void
  createExercise: (id: string, data: ExerciseData) => Promise<void>
  updateExercise: (id: string, data: ExerciseData) => Promise<void>
  deleteExercise: (id: string) => Promise<void>
}
