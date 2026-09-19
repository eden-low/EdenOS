import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { animeProgressWriteIntervalMs, normalizeAnimeProgress } from '../domain/anime'
import { createFirestoreAnimeProgressRepository } from '../repositories/firestoreAnimeProgressRepository'
import { readLocalAnimeProgress, writeLocalAnimeProgress } from '../services/animeProgressLocalStorage'
import type { AnimeProgress } from '../types/anime'
import { useFirebaseAuth } from './useFirebaseAuth'
import { AnimeProgressContext } from './animeProgressContextDefinition'

function newerProgress(local: AnimeProgress | undefined, cloud: AnimeProgress | undefined): AnimeProgress | undefined {
  if (!local) return cloud
  if (!cloud) return local
  return local.updatedAt >= cloud.updatedAt ? local : cloud
}

export function AnimeProgressProvider({ children }: { children: ReactNode }) {
  const { firestore, uid, isAnonymous } = useFirebaseAuth()
  const repository = useMemo(() => createFirestoreAnimeProgressRepository(firestore, uid), [firestore, uid])
  const [items, setItems] = useState<AnimeProgress[]>(() => readLocalAnimeProgress(localStorage))
  const [cloudError, setCloudError] = useState<string | null>(null)
  const itemsRef = useRef(items)
  const pendingRef = useRef(new Map<string, AnimeProgress>())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const reconciledRef = useRef(false)

  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => {
    reconciledRef.current = false
    if (isAnonymous) return
    return repository.subscribe({
      next(cloudItems) {
        setCloudError(null)
        if (!reconciledRef.current) {
          reconciledRef.current = true
          const localItems = readLocalAnimeProgress(localStorage)
          const ids = new Set([...localItems, ...cloudItems].map((item) => item.externalId))
          const merged = [...ids].flatMap((externalId) => {
            const local = localItems.find((item) => item.externalId === externalId)
            const cloud = cloudItems.find((item) => item.externalId === externalId)
            const winner = newerProgress(local, cloud)
            if (winner && local && (!cloud || local.updatedAt > cloud.updatedAt)) void repository.save(winner)
            return winner ? [winner] : []
          }).sort((a, b) => b.updatedAt - a.updatedAt)
          writeLocalAnimeProgress(localStorage, merged)
          setItems(merged)
          return
        }
        setItems((current) => {
          const cloudMap = new Map(cloudItems.map((item) => [item.externalId, item]))
          const merged = current.map((item) => newerProgress(item, cloudMap.get(item.externalId)) ?? item)
          for (const cloud of cloudItems) if (!merged.some((item) => item.externalId === cloud.externalId)) merged.push(cloud)
          const sorted = merged.sort((a, b) => b.updatedAt - a.updatedAt)
          writeLocalAnimeProgress(localStorage, sorted)
          return sorted
        })
      },
      error() { setCloudError('Cloud watch progress is temporarily unavailable.') },
    })
  }, [isAnonymous, repository])

  const flushProgress = useCallback(async (externalId?: string) => {
    if (isAnonymous) return
    const pending = externalId
      ? (pendingRef.current.get(externalId) ? [pendingRef.current.get(externalId)!] : [])
      : [...pendingRef.current.values()]
    for (const progress of pending) {
      pendingRef.current.delete(progress.externalId)
      const timer = timersRef.current.get(progress.externalId)
      if (timer) clearTimeout(timer)
      timersRef.current.delete(progress.externalId)
      try { await repository.save(progress); setCloudError(null) }
      catch { pendingRef.current.set(progress.externalId, progress); setCloudError('Cloud watch progress is temporarily unavailable.') }
    }
  }, [isAnonymous, repository])

  const saveProgress = useCallback((incoming: AnimeProgress, options?: { immediate?: boolean }) => {
    const progress = normalizeAnimeProgress({ ...incoming, updatedAt: Date.now() })
    setItems((current) => {
      const next = [progress, ...current.filter((item) => item.externalId !== progress.externalId)]
      writeLocalAnimeProgress(localStorage, next)
      return next
    })
    if (isAnonymous) return
    pendingRef.current.set(progress.externalId, progress)
    const existingTimer = timersRef.current.get(progress.externalId)
    if (existingTimer) clearTimeout(existingTimer)
    if (options?.immediate) {
      void flushProgress(progress.externalId)
    } else {
      timersRef.current.set(progress.externalId, setTimeout(() => void flushProgress(progress.externalId), animeProgressWriteIntervalMs))
    }
  }, [flushProgress, isAnonymous])

  useEffect(() => {
    const timers = timersRef.current
    function handleVisibility() { if (document.visibilityState === 'hidden') void flushProgress() }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      for (const timer of timers.values()) clearTimeout(timer)
      void flushProgress()
    }
  }, [flushProgress])

  const value = useMemo(() => ({ items, cloudError, saveProgress, flushProgress }), [items, cloudError, saveProgress, flushProgress])
  return <AnimeProgressContext.Provider value={value}>{children}</AnimeProgressContext.Provider>
}
