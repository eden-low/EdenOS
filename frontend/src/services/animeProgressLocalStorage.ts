import { isAnimeProgress, normalizeAnimeProgress } from '../domain/anime'
import type { AnimeProgress } from '../types/anime'

export const animeProgressStorageKey = 'edenos.animeWatchProgress.v1'

interface StoredAnimeProgress {
  version: 1
  items: AnimeProgress[]
}

export function readLocalAnimeProgress(storage: Storage): AnimeProgress[] {
  try {
    const raw = storage.getItem(animeProgressStorageKey)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || (data as { version?: unknown }).version !== 1 ||
        !Array.isArray((data as { items?: unknown }).items)) return []
    return (data as StoredAnimeProgress).items.filter(isAnimeProgress).map(normalizeAnimeProgress)
  } catch {
    return []
  }
}

export function writeLocalAnimeProgress(storage: Storage, items: AnimeProgress[]): void {
  const data: StoredAnimeProgress = { version: 1, items: items.map(normalizeAnimeProgress) }
  storage.setItem(animeProgressStorageKey, JSON.stringify(data))
}
