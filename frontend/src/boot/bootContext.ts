import { createContext, useContext } from 'react'

export interface BootAnimationState {
  enabled: boolean
  preferenceSaved: boolean
  canReplay: boolean
  setEnabled: (enabled: boolean) => void
  replay: () => boolean
}

export const BootAnimationContext = createContext<BootAnimationState | null>(null)
export function useBootAnimation() { return useContext(BootAnimationContext) }
