import { Timestamp, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import { isExpenseCategory } from '../domain/expense'
import { normalizeFinancePattern } from '../domain/financeRules'
import { isIncomeCategory } from '../domain/income'
import type { FinanceRule } from '../types/finance'
import type { FinanceRuleRepository } from './financeRuleRepository'

function millis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null
}

function decode(snapshot: QueryDocumentSnapshot<DocumentData>): FinanceRule | null {
  const data = snapshot.data()
  const createdAt = millis(data.createdAt)
  const updatedAt = millis(data.updatedAt)
  const validCategory = data.direction === 'expense' ? isExpenseCategory(data.category) : data.direction === 'income' ? isIncomeCategory(data.category) : false
  if ((data.direction !== 'expense' && data.direction !== 'income') || (data.matchType !== 'exact' && data.matchType !== 'contains') || typeof data.pattern !== 'string' || !normalizeFinancePattern(data.pattern) || !validCategory || typeof data.enabled !== 'boolean' || createdAt === null || updatedAt === null) return null
  return { id: snapshot.id, direction: data.direction, matchType: data.matchType, pattern: normalizeFinancePattern(data.pattern), category: data.category, enabled: data.enabled, createdAt, updatedAt }
}

export function createFirestoreFinanceRuleRepository(firestore: Firestore, uid: string): FinanceRuleRepository {
  const reference = collection(firestore, 'users', uid, 'financeRules')
  return {
    subscribe(observer) {
      return onSnapshot(query(reference, orderBy('createdAt', 'desc')), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
        observer.next(snapshot.docs.map(decode).filter((rule): rule is FinanceRule => rule !== null))
      }, observer.error)
    },
    async create(id, data) {
      await setDoc(doc(reference, id), { ...data, pattern: normalizeFinancePattern(data.pattern), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    },
    async setEnabled(id, enabled) {
      await updateDoc(doc(reference, id), { enabled, updatedAt: serverTimestamp() })
    },
    async delete(id) { await deleteDoc(doc(reference, id)) },
  }
}
