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
import { isExpenseCategory, isExpenseSource } from '../domain/expense'
import type { ExpenseData, ExpenseRecord } from '../types/records'
import type { ExpenseRepository } from './expenseRepository'

function toIsoString(value: unknown): string | null {
  if (!(value instanceof Timestamp)) return null
  const date = value.toDate()
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function mapExpenseDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): ExpenseRecord | null {
  const data = snapshot.data()
  const occurredAt = toIsoString(data.occurredAt)
  const createdAt = toIsoString(data.createdAt)
  const updatedAt = toIsoString(data.updatedAt)

  if (
    !Number.isSafeInteger(data.amountSen) ||
    data.amountSen <= 0 ||
    !isExpenseCategory(data.category) ||
    typeof data.title !== 'string' ||
    !data.title.trim() ||
    (data.note !== undefined && typeof data.note !== 'string') ||
    !occurredAt ||
    !createdAt ||
    !updatedAt ||
    !isExpenseSource(data.source)
  ) {
    if (import.meta.env.DEV) {
      console.warn(`Skipped malformed Firestore expense document: ${snapshot.id}`)
    }
    return null
  }

  return {
    id: snapshot.id,
    amountSen: data.amountSen,
    category: data.category,
    title: data.title.trim(),
    ...(data.note?.trim() ? { note: data.note.trim() } : {}),
    occurredAt,
    createdAt,
    updatedAt,
    source: data.source,
  }
}

function expenseDocumentData(data: ExpenseData) {
  return {
    amountSen: data.amountSen,
    category: data.category,
    title: data.title,
    ...(data.note ? { note: data.note } : {}),
    occurredAt: Timestamp.fromDate(new Date(data.occurredAt)),
    source: data.source,
  }
}

export function createFirestoreExpenseRepository(
  firestore: Firestore,
  uid: string,
): ExpenseRepository {
  const expenseCollection = collection(firestore, 'users', uid, 'expenses')

  return {
    subscribeExpenses(observer) {
      const expensesQuery = query(expenseCollection, orderBy('occurredAt', 'desc'))

      return onSnapshot(
        expensesQuery,
        { includeMetadataChanges: true },
        (snapshot) => {
          // Only publish server-confirmed snapshots so rejected writes never appear trusted.
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return

          observer.next(
            snapshot.docs
              .map(mapExpenseDocument)
              .filter((expense): expense is ExpenseRecord => expense !== null),
          )
        },
        observer.error,
      )
    },

    async createExpense(id, data) {
      const expenseReference = doc(expenseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExpense = await transaction.get(expenseReference)
        if (existingExpense.exists()) return

        transaction.set(expenseReference, {
          ...expenseDocumentData(data),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      })
    },

    async updateExpense(id, data) {
      const expenseReference = doc(expenseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExpense = await transaction.get(expenseReference)
        if (!existingExpense.exists()) throw new Error('Expense record does not exist.')

        transaction.update(expenseReference, {
          ...expenseDocumentData(data),
          note: data.note ?? deleteField(),
          updatedAt: serverTimestamp(),
        })
      })
    },

    async deleteExpense(id) {
      const expenseReference = doc(expenseCollection, id)
      await runTransaction(firestore, async (transaction) => {
        const existingExpense = await transaction.get(expenseReference)
        if (!existingExpense.exists()) return
        transaction.delete(expenseReference)
      })
    },
  }
}
