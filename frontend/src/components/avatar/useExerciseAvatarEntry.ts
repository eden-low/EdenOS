import { useLayoutEffect, useSyncExternalStore } from 'react'
import type { AppPage } from '../layout/Navigation'
import { browserExerciseAvatarEntries, type createExerciseAvatarEntries } from './exerciseAvatarEntry'

export function useExerciseAvatarEntry(page: AppPage, entries: ReturnType<typeof createExerciseAvatarEntries> = browserExerciseAvatarEntries) {
  // Snapshot reads stay pure, including Strict Mode's repeated renders.
  const form = useSyncExternalStore(entries.subscribe, () => entries.peek(page), () => null)
  useLayoutEffect(() => {
    entries.observe(page)
  }, [page, entries])
  // Do not mount a stale form/loader between a route render and its commit.
  return form
}
