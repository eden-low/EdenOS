import { collection, doc, getDocFromServer, getDocsFromServer, limit, query, type Firestore } from 'firebase/firestore'

// Read the owner's persisted data from the server. A cache-only or failed read must
// never authorize replacing an anonymous session.
export async function guestHasMeaningfulData(firestore: Firestore, uid: string): Promise<boolean> {
  const user = ['users', uid] as const
  const [expenses, exercises, preferences] = await Promise.all([
    getDocsFromServer(query(collection(firestore, ...user, 'expenses'), limit(1))),
    getDocsFromServer(query(collection(firestore, ...user, 'exercises'), limit(1))),
    getDocFromServer(doc(firestore, ...user, 'settings', 'preferences')),
  ])
  return !expenses.empty || !exercises.empty ||
    (preferences.exists() && Object.keys(preferences.data()).some((key) => key !== 'updatedAt'))
}
