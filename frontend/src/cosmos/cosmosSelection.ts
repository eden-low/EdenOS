import { createContext, useContext, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'
import type { CosmosSystemId } from './cosmosAiTypes'

export type CosmosExperience = CosmosSystemId | 'ai'
export const cosmosExperienceIds = ['tarot', 'iching', 'bazi', 'astrology', 'ziwei', 'ai'] as const satisfies readonly CosmosExperience[]

// One canonical selection, shared by the page and decoration. No records,
// results, URL guessing, DOM inspection, persistence or form-count rotation.
export function createCosmosSelection() {
  let experience: CosmosExperience = 'tarot'
  const listeners = new Set<() => void>()
  const setExperience: Dispatch<SetStateAction<CosmosExperience>> = (next) => {
    const selected = typeof next === 'function' ? next(experience) : next
    if (selected === experience) return
    experience = selected
    listeners.forEach(listener => listener())
  }
  return {
    getSnapshot: () => experience,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    setExperience,
  }
}
export const CosmosSelectionContext = createContext<ReturnType<typeof createCosmosSelection> | null>(null)
export function useCosmosSelection() {
  const selection = useContext(CosmosSelectionContext)
  if (!selection) throw new Error('Cosmos selection requires its provider')
  const experience = useSyncExternalStore(selection.subscribe, selection.getSnapshot, selection.getSnapshot)
  return [experience, selection.setExperience] as const
}
