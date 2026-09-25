import type { AnimeCataloguePage, AnimeCatalogueRequest, AnimeCatalogueStatus, AnimeSummary } from '../types/anime'

export interface AnimeRepository {
  fetchPage: (request: AnimeCatalogueRequest) => Promise<AnimeCataloguePage>
  searchTitles: (query: string, resultLimit?: number) => Promise<AnimeSummary[]>
  fetchRecent: (resultLimit?: number) => Promise<AnimeSummary[]>
  countUpdatedSince: (since: Date) => Promise<number>
  fetchPublishedSince: (since: Date, resultLimit?: number) => Promise<AnimeSummary[]>
  countPublishedSince: (since: Date) => Promise<number>
  getCatalogueStatus: () => Promise<AnimeCatalogueStatus | null>
}
