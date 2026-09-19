import type { AnimeCataloguePage, AnimeCatalogueRequest, AnimeSummary } from '../types/anime'

export interface AnimeRepository {
  fetchPage: (request: AnimeCatalogueRequest) => Promise<AnimeCataloguePage>
  searchTitles: (query: string, resultLimit?: number) => Promise<AnimeSummary[]>
}
