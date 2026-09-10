import { createContext } from 'react'
import type { Firestore } from 'firebase/firestore'

export interface FirebaseSession {
  uid: string
  firestore: Firestore
}

export const FirebaseAuthContext = createContext<FirebaseSession | null>(null)
