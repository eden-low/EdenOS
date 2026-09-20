import { createContext } from 'react'

export interface PrivacyLockContextValue {
  enabled: boolean
  locked: boolean
  retryAt: number
  setup: (pin: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  changePin: (currentPin: string, nextPin: string) => Promise<boolean>
  disable: (currentPin: string) => Promise<boolean>
  requestUnlock: () => void
}

export const unlockedPrivacyLock: PrivacyLockContextValue = {
  enabled: false,
  locked: false,
  retryAt: 0,
  setup: async () => undefined,
  unlock: async () => true,
  lock: () => undefined,
  changePin: async () => false,
  disable: async () => false,
  requestUnlock: () => undefined,
}

export const PrivacyLockContext = createContext<PrivacyLockContextValue>(unlockedPrivacyLock)
