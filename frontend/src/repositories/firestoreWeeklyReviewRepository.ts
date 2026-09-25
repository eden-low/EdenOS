import { Timestamp, doc, onSnapshot, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import type { WeeklyReviewReflection } from '../types/weeklyReview'
import type { WeeklyReviewRepository } from './weeklyReviewRepository'

function text(value: unknown): string { return typeof value === 'string' ? value : '' }

export function createFirestoreWeeklyReviewRepository(firestore: Firestore, uid: string): WeeklyReviewRepository {
  return {
    subscribe(weekKey, observer) {
      return onSnapshot(doc(firestore, 'users', uid, 'weeklyReviews', weekKey), (snapshot) => {
        if (!snapshot.exists()) { observer.next(null); return }
        const data = snapshot.data()
        if (!(data.updatedAt instanceof Timestamp)) { observer.error(new Error('Malformed Weekly Review')); return }
        const reflection: WeeklyReviewReflection = { wentWell: text(data.wentWell), improve: text(data.improve), nextFocus: text(data.nextFocus), updatedAt: data.updatedAt.toMillis() }
        observer.next(reflection)
      }, observer.error)
    },
    async save(weekKey, reflection) {
      await setDoc(doc(firestore, 'users', uid, 'weeklyReviews', weekKey), { ...reflection, updatedAt: serverTimestamp() })
    },
  }
}
