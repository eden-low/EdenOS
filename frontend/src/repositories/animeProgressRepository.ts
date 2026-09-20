import type { AnimeProgress } from '../types/anime'

export interface AnimeProgressRepository {
  subscribe: (observer: { next: (items: AnimeProgress[]) => void; error: (error: unknown) => void }) => () => void
  readAllFromServer: () => Promise<AnimeProgress[]>
  save: (progress: AnimeProgress) => Promise<void>
}
