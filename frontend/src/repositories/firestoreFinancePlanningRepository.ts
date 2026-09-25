import {
  Timestamp, collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
  type DocumentData, type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { isExpenseCategory } from '../domain/expense'
import type { FinanceBudget, FinanceBudgetData, FinanceGoal, FinanceGoalData, FinanceGoalAllocation } from '../types/finance'
import type { FinancePlanningRepository } from './financePlanningRepository'

function millis(value: unknown): number | null { return value instanceof Timestamp ? value.toMillis() : null }
function iso(value: unknown): string | null { return value instanceof Timestamp ? value.toDate().toISOString() : null }
function validAmount(value: unknown, allowZero = false): value is number { return Number.isSafeInteger(value) && (allowZero ? Number(value) >= 0 : Number(value) > 0) }

function decodeGoal(snapshot: QueryDocumentSnapshot<DocumentData>): FinanceGoal | null {
  const data = snapshot.data(); const createdAt = millis(data.createdAt); const updatedAt = millis(data.updatedAt)
  const targetDate = data.targetDate === null ? null : iso(data.targetDate)
  if (typeof data.name !== 'string' || !data.name.trim() || !validAmount(data.targetAmountSen) || !validAmount(data.allocatedAmountSen, true) || targetDate === null && data.targetDate !== null || (data.status !== 'active' && data.status !== 'archived') || createdAt === null || updatedAt === null) return null
  return { id: snapshot.id, name: data.name.trim(), targetAmountSen: data.targetAmountSen, allocatedAmountSen: data.allocatedAmountSen, targetDate, status: data.status, createdAt, updatedAt, source: 'stored' }
}

function decodeBudget(snapshot: QueryDocumentSnapshot<DocumentData>): FinanceBudget | null {
  const data = snapshot.data(); const createdAt = millis(data.createdAt); const updatedAt = millis(data.updatedAt)
  if (typeof data.name !== 'string' || !data.name.trim() || !validAmount(data.monthlyAmountSen) || (data.category !== null && !isExpenseCategory(data.category)) || (data.status !== 'active' && data.status !== 'archived') || createdAt === null || updatedAt === null) return null
  return { id: snapshot.id, name: data.name.trim(), monthlyAmountSen: data.monthlyAmountSen, category: data.category, status: data.status, createdAt, updatedAt }
}

function decodeAllocation(snapshot: QueryDocumentSnapshot<DocumentData>): FinanceGoalAllocation | null {
  const data = snapshot.data(); const occurredAt = iso(data.occurredAt); const createdAt = millis(data.createdAt)
  if (typeof data.goalId !== 'string' || !data.goalId || !validAmount(data.amountSen) || occurredAt === null || createdAt === null) return null
  return { id: snapshot.id, goalId: data.goalId, amountSen: data.amountSen, occurredAt, createdAt }
}

function goalData(data: FinanceGoalData, allocatedAmountSen: number) {
  return { name: data.name.trim(), targetAmountSen: data.targetAmountSen, allocatedAmountSen, targetDate: data.targetDate ? Timestamp.fromDate(new Date(`${data.targetDate}T12:00:00`)) : null, status: data.status }
}

function budgetData(data: FinanceBudgetData) { return { ...data, name: data.name.trim() } }

export function createFirestoreFinancePlanningRepository(firestore: Firestore, uid: string): FinancePlanningRepository {
  const user = doc(firestore, 'users', uid)
  const goals = collection(user, 'financeGoals')
  const budgets = collection(user, 'financeBudgets')
  const allocations = collection(user, 'financeGoalAllocations')
  return {
    subscribeGoals(observer) {
      return onSnapshot(query(goals, orderBy('createdAt', 'asc')), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
        observer.next(snapshot.docs.map(decodeGoal).filter((item): item is FinanceGoal => item !== null))
      }, observer.error)
    },
    subscribeBudgets(observer) {
      return onSnapshot(query(budgets, orderBy('createdAt', 'asc')), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
        observer.next(snapshot.docs.map(decodeBudget).filter((item): item is FinanceBudget => item !== null))
      }, observer.error)
    },
    subscribeAllocations(start, end, observer) {
      return onSnapshot(query(allocations, where('occurredAt', '>=', Timestamp.fromDate(start)), where('occurredAt', '<', Timestamp.fromDate(end)), orderBy('occurredAt', 'desc')), { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return
        observer.next(snapshot.docs.map(decodeAllocation).filter((item): item is FinanceGoalAllocation => item !== null))
      }, observer.error)
    },
    async createGoal(id, data, initialAllocationSen) {
      if (!validAmount(data.targetAmountSen) || !validAmount(initialAllocationSen, true)) throw new Error('Invalid goal amount')
      await runTransaction(firestore, async (transaction) => {
        const goalReference = doc(goals, id)
        if ((await transaction.get(goalReference)).exists()) throw new Error('Goal already exists')
        transaction.set(goalReference, { ...goalData(data, initialAllocationSen), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      })
    },
    async updateGoal(goal, data) {
      const reference = doc(goals, goal.id)
      if (goal.source === 'legacy') await setDoc(reference, { ...goalData(data, goal.allocatedAmountSen), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      else await updateDoc(reference, { ...goalData(data, goal.allocatedAmountSen), updatedAt: serverTimestamp() })
    },
    async contribute(goal, amountSen, occurredAt, allocationId) {
      if (!validAmount(amountSen)) throw new Error('Invalid allocation amount')
      await runTransaction(firestore, async (transaction) => {
        const goalReference = doc(goals, goal.id); const snapshot = await transaction.get(goalReference)
        const current = snapshot.exists() && validAmount(snapshot.data().allocatedAmountSen, true) ? snapshot.data().allocatedAmountSen : goal.allocatedAmountSen
        if (snapshot.exists()) transaction.update(goalReference, { allocatedAmountSen: current + amountSen, updatedAt: serverTimestamp() })
        else transaction.set(goalReference, { ...goalData(goal, current + amountSen), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        transaction.set(doc(allocations, allocationId), { goalId: goal.id, amountSen, occurredAt: Timestamp.fromDate(occurredAt), createdAt: serverTimestamp() })
      })
    },
    async createBudget(id, data) { await setDoc(doc(budgets, id), { ...budgetData(data), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) },
    async updateBudget(id, data) { await updateDoc(doc(budgets, id), { ...budgetData(data), updatedAt: serverTimestamp() }) },
  }
}
