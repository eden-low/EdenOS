import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { isAnimeProgress, normalizeAnimeProgress } from '../domain/anime'
import type { AnimeProgress } from '../types/anime'
import type { AnimeProgressRepository } from './animeProgressRepository'

function decodeProgress(snapshot: QueryDocumentSnapshot<DocumentData>): AnimeProgress | null {
  const data = snapshot.data()
  const updatedAt = data.updatedAt && typeof data.updatedAt.toMillis === 'function'
    ? (data.updatedAt as Timestamp).toMillis() : 0
  const progress: AnimeProgress = {
    externalId: data.externalId,
    animeId: data.animeId,
    currentEpisode: data.currentEpisode,
    positionSeconds: data.positionSeconds,
    durationSeconds: data.durationSeconds,
    watchedEpisodes: data.watchedEpisodes,
    trackingStatus: data.trackingStatus,
    updatedAt,
    title: data.title,
    ...(typeof data.coverUrl === 'string' ? { coverUrl: data.coverUrl } : {}),
    ...(Number.isInteger(data.totalEpisodes) ? { totalEpisodes: data.totalEpisodes } : {}),
  }
  return snapshot.id === progress.externalId && isAnimeProgress(progress) ? normalizeAnimeProgress(progress) : null
}

export function createFirestoreAnimeProgressRepository(firestore: Firestore, uid: string): AnimeProgressRepository {
  const reference = collection(firestore, 'users', uid, 'animeWatchProgress')
  return {
    subscribe(observer) {
      return onSnapshot(query(reference, orderBy('updatedAt', 'desc')), (snapshot) => {
        observer.next(snapshot.docs.flatMap((item) => {
          const progress = decodeProgress(item)
          return progress ? [progress] : []
        }))
      }, observer.error)
    },
    async save(progress) {
      const normalized = normalizeAnimeProgress(progress)
      const payload = {
        externalId: normalized.externalId,
        animeId: normalized.animeId,
        currentEpisode: normalized.currentEpisode,
        positionSeconds: normalized.positionSeconds,
        durationSeconds: normalized.durationSeconds,
        watchedEpisodes: normalized.watchedEpisodes,
        trackingStatus: normalized.trackingStatus,
        updatedAt: serverTimestamp(),
        title: normalized.title,
        ...(normalized.coverUrl ? { coverUrl: normalized.coverUrl } : {}),
        ...(normalized.totalEpisodes ? { totalEpisodes: normalized.totalEpisodes } : {}),
      }
      await setDoc(doc(reference, normalized.externalId), payload)
    },
  }
}
