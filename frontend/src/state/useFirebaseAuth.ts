import { useContext } from 'react'
import { FirebaseAuthContext, type FirebaseSession } from './firebaseAuthContextDefinition'

export function useFirebaseAuth(): FirebaseSession {
  const session = useContext(FirebaseAuthContext)
  if (!session) throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider')
  return session
}
