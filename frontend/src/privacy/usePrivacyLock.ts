import { useContext } from 'react'
import { PrivacyLockContext } from './privacyLockContext'

export function usePrivacyLock() {
  return useContext(PrivacyLockContext)
}
