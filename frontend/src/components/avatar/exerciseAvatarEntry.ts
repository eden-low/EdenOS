import type { AppPage } from '../layout/Navigation'

export type ExerciseAvatarId = 'eden-swim' | 'eden-boxing'
export const exerciseAvatarSessionKey = 'edenos:exercise-avatar:v1'
interface EntrySession {
  storage: Pick<Storage, 'getItem' | 'setItem'>
  owner: string
}

// The controller observes committed pages, never component renders, image loads
// or route event counts. Its lifetime is one browser Document, including BFCache.
export function createExerciseAvatarEntries(session: () => EntrySession) {
  let page: AppPage | null = null
  let current: ExerciseAvatarId | null = null
  const listeners = new Set<() => void>()
  function consume(): ExerciseAvatarId {
    try {
      const { storage, owner } = session()
      const raw = storage.getItem(exerciseAvatarSessionKey)
      let next: ExerciseAvatarId = 'eden-swim'
      if (raw) {
        try {
          const saved: unknown = JSON.parse(raw)
          if (saved && typeof saved === 'object' && 'version' in saved && saved.version === 1 &&
            'owner' in saved && saved.owner === owner && 'next' in saved &&
            (saved.next === 'eden-swim' || saved.next === 'eden-boxing')) next = saved.next
        } catch { /* Corrupt data starts safely from Swim and is repaired below. */ }
      }
      // Two values alternate indefinitely without an overflowing numeric count.
      storage.setItem(exerciseAvatarSessionKey, JSON.stringify({ version: 1, owner, next: next === 'eden-swim' ? 'eden-boxing' : 'eden-swim' }))
      return next
    } catch { return 'eden-swim' }
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    peek: (requested: AppPage) => requested === page ? current : null,
    observe(requested: AppPage): ExerciseAvatarId | null {
      if (requested === page) return current
      page = requested
      current = requested === 'exercise' ? consume() : null
      listeners.forEach((listener) => listener())
      return current
    },
  }
}

// sessionStorage is initially copied by window.open. A non-sensitive tab marker
// in window.name survives same-tab reloads but is absent in a fresh child context.
// Preserve any existing name. The time origin identifies the tab; it never
// selects a form, and no random number or cross-tab localStorage is used.
let tabOwner: string | undefined
function browserSession(): EntrySession {
  if (!tabOwner) {
    const marker = window.name.match(/\[edenos-exercise-tab:([\d.]+)\]/)?.[1]
    const owner = marker ?? String(performance.timeOrigin)
    if (!marker) window.name += `[edenos-exercise-tab:${owner}]`
    if (!window.name.includes(`[edenos-exercise-tab:${owner}]`)) throw new Error('Tab marker unavailable')
    tabOwner = owner
  }
  return { storage: window.sessionStorage, owner: tabOwner }
}
export const browserExerciseAvatarEntries = createExerciseAvatarEntries(browserSession)
