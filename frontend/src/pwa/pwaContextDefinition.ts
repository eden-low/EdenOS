import { createContext } from 'react'

export interface PwaUpdateState {
  updateAvailable: boolean
  applyUpdate: () => Promise<void>
  dismissUpdate: () => void
}

export const PwaContext = createContext<PwaUpdateState | null>(null)
