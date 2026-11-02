import { isAnimeProgress, normalizeAnimeProgress } from '../domain/anime'
import type { AnimeProgress } from '../types/anime'

export const legacyAnimeProgressStorageKey = 'edenos.animeWatchProgress.v1'
export const animeProgressStorageKeyPrefix = 'edenos.animeWatchProgress.v2:'

interface StoredAnimeProgress {
  version: 2
  items: AnimeProgress[]
}

export function animeProgressStorageKey(uid: string): string {
  if (!uid.trim()) throw new Error('A Firebase UID is required for Anime progress storage.')
  return `${animeProgressStorageKeyPrefix}${encodeURIComponent(uid)}`
}

export function readLocalAnimeProgress(storage: Storage, uid: string): AnimeProgress[] {
  try {
    const raw = storage.getItem(animeProgressStorageKey(uid))
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || (data as { version?: unknown }).version !== 2 ||
        !Array.isArray((data as { items?: unknown }).items)) return []
    return (data as StoredAnimeProgress).items.filter(isAnimeProgress).map(normalizeAnimeProgress)
  } catch {
    return []
  }
}

export function writeLocalAnimeProgress(storage: Storage, uid: string, items: AnimeProgress[]): void {
  const data: StoredAnimeProgress = { version: 2, items: items.map(normalizeAnimeProgress) }
  storage.setItem(animeProgressStorageKey(uid), JSON.stringify(data))
}
