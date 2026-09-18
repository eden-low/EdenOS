import {
  Timestamp,
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { RecordNotFoundWriteError } from '../lib/firebaseWriteError'
import type { ExerciseData, ExerciseRecord } from '../types/records'
import type { ExerciseRepository } from './exerciseRepository'

const exerciseFields = new Set([
  'activity',
  'intensity',
  'distanceMetres',
  'durationSeconds',
  'source',
  'occurredAt',
  'createdAt',
  'updatedAt',
  'metricsSource', 'reportedActiveCaloriesKcal', 'reportedTotalCaloriesKcal',
  'reportedAverageHeartRateBpm', 'reportedSteps',
])

function toIsoString(value: unknown): string | null {
  if (!(value instanceof Timestamp)) return null
  const date = value.toDate()
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function mapExerciseDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ExerciseRecord | null {
  const data = snapshot.data()
  const activity = typeof data.activity === 'string' ? data.activity.trim() : ''
  const occurredAt = toIsoString(data.occurredAt)
  const createdAt = toIsoString(data.createdAt)
  const updatedAt = toIsoString(data.updatedAt)
  const hasOnlyExerciseFields = Object.keys(data).every((field) => exerciseFields.has(field))
  const hasValidDistance =
    data.distanceMetres === undefined ||
    (Number.isSafeInteger(data.distanceMetres) && data.distanceMetres > 0)
  const validMetric = (value: unknown, min: number) => value === undefined ||
    (Number.isSafeInteger(value) && typeof value === 'number' && value >= min)
  const hasReportedMetrics = ['metricsSource', 'reportedActiveCaloriesKcal', 'reportedTotalCaloriesKcal',
    'reportedAverageHeartRateBpm', 'reportedSteps'].some((field) => data[field] !== undefined)

  if (
    !hasOnlyExerciseFields ||
    !activity ||
    activity.length > 80 ||
    !Number.isSafeInteger(data.durationSeconds) ||
    data.durationSeconds <= 0 ||
    !hasValidDistance ||
    (data.intensity !== undefined && !['light', 'moderate', 'vigorous'].includes(data.intensity)) ||
    !['manual', 'text', 'fitness_screenshot'].includes(data.source) ||
    (hasReportedMetrics && data.source !== 'fitness_screenshot') ||
    (data.metricsSource !== undefined && !['Apple Fitness', 'Apple Health', 'Fitness screenshot'].includes(data.metricsSource)) ||
    !validMetric(data.reportedActiveCaloriesKcal, 0) ||
    !validMetric(data.reportedTotalCaloriesKcal, 0) ||
    !validMetric(data.reportedAverageHeartRateBpm, 1) || !validMetric(data.reportedSteps, 0) ||
    !occurredAt ||
    !createdAt ||
    !updatedAt
  ) {
    if (import.meta.env.DEV) {
      console.warn(`Skipped malformed Firestore exercise document: ${snapshot.id}`)
    }
    return null
  }

  return {
    id: snapshot.id,
    activity,
    ...(data.intensity === undefined ? {} : { intensity: data.intensity }),
    ...(data.distanceMetres === undefined ? {} : { distanceMetres: data.distanceMetres }),
    durationSeconds: data.durationSeconds,
    source: data.source,
    ...(data.metricsSource === undefined ? {} : { metricsSource: data.metricsSource }),
    ...(data.reportedActiveCaloriesKcal === undefined ? {} : { reportedActiveCaloriesKcal: data.reportedActiveCaloriesKcal }),
    ...(data.reportedTotalCaloriesKcal === undefined ? {} : { reportedTotalCaloriesKcal: data.reportedTotalCaloriesKcal }),
    ...(data.reportedAverageHeartRateBpm === undefined ? {} : { reportedAverageHeartRateBpm: data.reportedAverageHeartRateBpm }),
    ...(data.reportedSteps === undefined ? {} : { reportedSteps: data.reportedSteps }),
    occurredAt,
    createdAt,
    updatedAt,
  }
}

function exerciseDocumentData(data: ExerciseData) {
  return {
    activity: data.activity.trim(),
    ...(data.intensity === undefined ? {} : { intensity: data.intensity }),
    ...(data.distanceMetres === undefined ? {} : { distanceMetres: data.distanceMetres }),
    durationSeconds: data.durationSeconds,
    source: data.source,
    ...(data.metricsSource === undefined ? {} : { metricsSource: data.metricsSource }),
    ...(data.reportedActiveCaloriesKcal === undefined ? {} : { reportedActiveCaloriesKcal: data.reportedActiveCaloriesKcal }),
    ...(data.reportedTotalCaloriesKcal === undefined ? {} : { reportedTotalCaloriesKcal: data.reportedTotalCaloriesKcal }),
    ...(data.reportedAverageHeartRateBpm === undefined ? {} : { reportedAverageHeartRateBpm: data.reportedAverageHeartRateBpm }),
    ...(data.reportedSteps === undefined ? {} : { reportedSteps: data.reportedSteps }),
    occurredAt: Timestamp.fromDate(new Date(data.occurredAt)),
  }
}

export function createFirestoreExerciseRepository(
  firestore: Firestore,
  uid: string,
): ExerciseRepository {
  const exerciseCollection = collection(firestore, 'users', uid, 'exercises')

  return {
    subscribeExercises(observer) {
      const exercisesQuery = query(exerciseCollection, orderBy('occurredAt', 'desc'))

      return onSnapshot(
        exercisesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          // Only publish server-confirmed snapshots so rejected writes never appear trusted.
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return

          observer.next(
            snapshot.docs
              .map(mapExerciseDocument)
              .filter((exercise): exercise is ExerciseRecord => exercise !== null),
          )
        },
        observer.error,
      )
    },

    async createExercise(id, data) {
      const exerciseReference = doc(exerciseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExercise = await transaction.get(exerciseReference)
        if (existingExercise.exists()) return

        transaction.set(exerciseReference, {
          ...exerciseDocumentData(data),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    },

    async updateExercise(id, data) {
      const exerciseReference = doc(exerciseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExercise = await transaction.get(exerciseReference)
        if (!existingExercise.exists()) throw new RecordNotFoundWriteError('Exercise')

        transaction.update(exerciseReference, {
          ...exerciseDocumentData(data),
          distanceMetres: data.distanceMetres ?? deleteField(),
          intensity: data.intensity ?? deleteField(),
          metricsSource: data.metricsSource ?? deleteField(),
          reportedActiveCaloriesKcal: data.reportedActiveCaloriesKcal ?? deleteField(),
          reportedTotalCaloriesKcal: data.reportedTotalCaloriesKcal ?? deleteField(),
          reportedAverageHeartRateBpm: data.reportedAverageHeartRateBpm ?? deleteField(),
          reportedSteps: data.reportedSteps ?? deleteField(),
          updatedAt: serverTimestamp(),
        })
      })
    },

    async deleteExercise(id) {
      const exerciseReference = doc(exerciseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExercise = await transaction.get(exerciseReference)
        if (!existingExercise.exists()) throw new RecordNotFoundWriteError('Exercise')
        transaction.delete(exerciseReference)
      })
    },
  }
}
