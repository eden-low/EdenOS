import {
  collection,
  endAt,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  startAt,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { animePageSize, buildAnimeFilterKey, isAnimeMediaType, isAnimeRegion, isAnimeStatus, isValidExternalId, normalizeAnimeTitle } from '../domain/anime'
import type { AnimeRepository } from './animeRepository'
import type { AnimeCatalogueFilters, AnimeSummary } from '../types/anime'

function optionalString(data: DocumentData, key: string): string | undefined {
  return typeof data[key] === 'string' && data[key].trim() ? data[key].trim() : undefined
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && typeof value === 'number' && value > 0 ? value : undefined
}

function toMillis(value: unknown): number | null {
  return value && typeof value === 'object' && 'toMillis' in value && typeof (value as Timestamp).toMillis === 'function'
    ? (value as Timestamp).toMillis() : null
}

export function decodeAnimeSummary(snapshot: QueryDocumentSnapshot<DocumentData>): AnimeSummary {
  const data = snapshot.data()
  const externalId = typeof data.externalId === 'string' ? data.externalId : snapshot.id
  const updatedAt = toMillis(data.updatedAt)
  if (!isValidExternalId(externalId) || externalId !== snapshot.id ||
      typeof data.title !== 'string' || !data.title.trim() ||
      typeof data.titleNormalized !== 'string' || !data.titleNormalized.trim() ||
      typeof data.coverUrl !== 'string' || !data.coverUrl.trim() ||
      !isAnimeMediaType(data.mediaType) || !isAnimeStatus(data.status) ||
      !Array.isArray(data.genres) || !data.genres.every((genre: unknown) => typeof genre === 'string' && !!genre.trim()) ||
      !Array.isArray(data.filterKeys) || !data.filterKeys.every((key: unknown) => typeof key === 'string') ||
      updatedAt === null) throw new Error(`Malformed Anime catalogue document: ${snapshot.id}`)
  if (data.region !== undefined && !isAnimeRegion(data.region)) throw new Error(`Malformed Anime region: ${snapshot.id}`)
  const score = typeof data.score === 'number' && Number.isFinite(data.score) ? data.score : undefined
  const year = optionalPositiveInteger(data.year)
  const totalEpisodes = optionalPositiveInteger(data.totalEpisodes)
  return {
    externalId,
    title: data.title.trim(),
    titleNormalized: data.titleNormalized.trim(),
    ...(optionalString(data, 'titleZh') ? { titleZh: optionalString(data, 'titleZh') } : {}),
    ...(optionalString(data, 'titleEn') ? { titleEn: optionalString(data, 'titleEn') } : {}),
    ...(optionalString(data, 'titleNative') ? { titleNative: optionalString(data, 'titleNative') } : {}),
    coverUrl: data.coverUrl,
    ...(score !== undefined ? { score } : {}),
    mediaType: data.mediaType,
    ...(data.region !== undefined ? { region: data.region } : {}),
    genres: data.genres.map((genre: string) => genre.trim()),
    status: data.status,
    ...(year !== undefined ? { year } : {}),
    ...(totalEpisodes !== undefined ? { totalEpisodes } : {}),
    updatedAt,
    filterKeys: data.filterKeys,
  }
}

function queryConstraints(search: string, filters: AnimeCatalogueFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = []
  const filterKey = buildAnimeFilterKey(filters)
  if (filterKey) constraints.push(where('filterKeys', 'array-contains', filterKey))
  const normalizedSearch = normalizeAnimeTitle(search)
  if (normalizedSearch) {
    constraints.push(orderBy('titleNormalized', 'asc'), startAt(normalizedSearch), endAt(`${normalizedSearch}\uf8ff`))
  } else {
    constraints.push(orderBy('updatedAt', 'desc'))
  }
  return constraints
}

export function createFirestoreAnimeRepository(firestore: Firestore): AnimeRepository {
  const reference = collection(firestore, 'animes')
  return {
    async fetchPage(request) {
      const baseConstraints = queryConstraints(request.search, request.filters)
      const pageConstraints = [...baseConstraints]
      if (request.cursor) pageConstraints.push(startAfter(request.cursor))
      pageConstraints.push(limit(animePageSize))
      const [snapshot, count] = await Promise.all([
        getDocs(query(reference, ...pageConstraints)),
        getCountFromServer(query(reference, ...baseConstraints)),
      ])
      const items = snapshot.docs.map(decodeAnimeSummary)
      const cursor = snapshot.docs.at(-1)
      const total = count.data().count
      const loadedCount = (request.loadedCount ?? 0) + items.length
      return { items, cursor, total, hasMore: items.length === animePageSize && loadedCount < total }
    },
    async searchTitles(search, resultLimit = 8) {
      const normalizedSearch = normalizeAnimeTitle(search)
      if (!normalizedSearch) return []
      const snapshot = await getDocs(query(
        reference,
        orderBy('titleNormalized', 'asc'),
        startAt(normalizedSearch),
        endAt(`${normalizedSearch}\uf8ff`),
        limit(Math.min(Math.max(1, resultLimit), 20)),
      ))
      return snapshot.docs.map(decodeAnimeSummary)
    },
  }
}
