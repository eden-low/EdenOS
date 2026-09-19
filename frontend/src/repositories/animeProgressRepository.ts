import type { AnimeProgress } from '../types/anime'

export interface AnimeProgressRepository {
  subscribe: (observer: { next: (items: AnimeProgress[]) => void; error: (error: unknown) => void }) => () => void
  save: (progress: AnimeProgress) => Promise<void>
}
