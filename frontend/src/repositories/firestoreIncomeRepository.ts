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
import { isIncomeCategory } from '../domain/income'
import { RecordNotFoundWriteError } from '../lib/firebaseWriteError'
import type { IncomeData, IncomeRecord } from '../types/records'
import type { IncomeRepository } from './incomeRepository'

function toIsoString(value: unknown): string | null {
  if (!(value instanceof Timestamp)) return null
  const date = value.toDate()
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function mapIncomeDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): IncomeRecord | null {
  const data = snapshot.data()
  const occurredAt = toIsoString(data.occurredAt)
  const createdAt = toIsoString(data.createdAt)
  const updatedAt = toIsoString(data.updatedAt)

  if (
    !Number.isSafeInteger(data.amountSen) ||
    data.amountSen <= 0 ||
    !isIncomeCategory(data.category) ||
    typeof data.description !== 'string' ||
    !data.description.trim() ||
    (data.note !== undefined && typeof data.note !== 'string') ||
    !occurredAt ||
    !createdAt ||
    !updatedAt
  ) {
    if (import.meta.env.DEV) console.warn(`Skipped malformed Firestore income document: ${snapshot.id}`)
    return null
  }

  return {
    id: snapshot.id,
    amountSen: data.amountSen,
    category: data.category,
    description: data.description.trim(),
    ...(data.note?.trim() ? { note: data.note.trim() } : {}),
    occurredAt,
    createdAt,
    updatedAt,
  }
}

function incomeDocumentData(data: IncomeData) {
  if (!Number.isSafeInteger(data.amountSen) || data.amountSen <= 0) {
    throw new Error('Income amount must be a positive integer in sen.')
  }
  if (!isIncomeCategory(data.category) || !data.description.trim() || data.description.trim().length > 120 || (data.note?.length ?? 0) > 500) {
    throw new Error('Income requires a valid category and description.')
  }
  return {
    amountSen: data.amountSen,
    category: data.category,
    description: data.description,
    ...(data.note ? { note: data.note } : {}),
    occurredAt: Timestamp.fromDate(new Date(data.occurredAt)),
  }
}

export function createFirestoreIncomeRepository(firestore: Firestore, uid: string): IncomeRepository {
  const incomeCollection = collection(firestore, 'users', uid, 'incomes')
  return {
    subscribeIncomes(observer) {
      return onSnapshot(
        query(incomeCollection, orderBy('occurredAt', 'desc')),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
          observer.next(snapshot.docs.map(mapIncomeDocument).filter((income): income is IncomeRecord => income !== null))
        },
        observer.error,
      )
    },
    async createIncome(id, data) {
      const reference = doc(incomeCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existing = await transaction.get(reference)
        if (existing.exists()) return
        transaction.set(reference, {
          ...incomeDocumentData(data),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    },
    async updateIncome(id, data) {
      const reference = doc(incomeCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existing = await transaction.get(reference)
        if (!existing.exists()) throw new RecordNotFoundWriteError('Income')
        transaction.update(reference, {
          ...incomeDocumentData(data),
          note: data.note ?? deleteField(),
          updatedAt: serverTimestamp(),
        })
      })
    },
    async deleteIncome(id) {
      const reference = doc(incomeCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existing = await transaction.get(reference)
        if (!existing.exists()) throw new RecordNotFoundWriteError('Income')
        transaction.delete(reference)
      })
    },
  }
}
