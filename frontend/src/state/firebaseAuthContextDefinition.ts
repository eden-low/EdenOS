import { createContext } from 'react'
import type { Firestore } from 'firebase/firestore'
import type { ConnectGoogleResult, ContinueExistingGoogleResult } from '../types/account'

export interface FirebaseSession {
  uid: string
  firestore: Firestore
  isAnonymous: boolean
  email: string | null
  connectGoogle: () => Promise<ConnectGoogleResult>
  continueWithExistingGoogle: () => Promise<ContinueExistingGoogleResult>
  discardExistingGoogleChoice: () => void
  signOutGoogle: () => Promise<void>
}

export const FirebaseAuthContext = createContext<FirebaseSession | null>(null)
