import { createContext } from 'react'
import type { Firestore } from 'firebase/firestore'

export interface FirebaseSession {
  uid: string
  firestore: Firestore
  isAnonymous: boolean
  email: string | null
  connectGoogle: () => Promise<'connected' | 'cancelled'>
  signOutGoogle: () => Promise<void>
}

export const FirebaseAuthContext = createContext<FirebaseSession | null>(null)
