import { createContext } from 'react'
import type { AnimeProgress } from '../types/anime'

export interface AnimeProgressContextValue {
  items: AnimeProgress[]
  cloudError: string | null
  saveProgress: (progress: AnimeProgress, options?: { immediate?: boolean }) => void
  flushProgress: (externalId?: string) => Promise<void>
}

export const AnimeProgressContext = createContext<AnimeProgressContextValue | null>(null)
