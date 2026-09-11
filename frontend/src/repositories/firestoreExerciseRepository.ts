import {
  Timestamp,
  collection,
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
import type { ExerciseData, ExerciseRecord } from '../types/records'
import type { ExerciseRepository } from './exerciseRepository'

const exerciseFields = new Set([
  'activity',
  'distanceMetres',
  'durationSeconds',
  'source',
  'occurredAt',
  'createdAt',
  'updatedAt',
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

  if (
    !hasOnlyExerciseFields ||
    !activity ||
    activity.length > 80 ||
    !Number.isSafeInteger(data.durationSeconds) ||
    data.durationSeconds <= 0 ||
    !hasValidDistance ||
    data.source !== 'manual' ||
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
    ...(data.distanceMetres === undefined ? {} : { distanceMetres: data.distanceMetres }),
    durationSeconds: data.durationSeconds,
    source: 'manual',
    occurredAt,
    createdAt,
    updatedAt,
  }
}

function exerciseDocumentData(data: ExerciseData) {
  return {
    activity: data.activity.trim(),
    ...(data.distanceMetres === undefined ? {} : { distanceMetres: data.distanceMetres }),
    durationSeconds: data.durationSeconds,
    source: data.source,
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
  }
}
