import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { sourceMappingId } from './identity'
import type { AnimeMediaType, AnimeRegion } from '../../src/types/anime'
import type { CanonicalAnime, CatalogueStorageMetrics, PreparedCanonicalWrite, SourceMapping, SyncCheckpoint, SyncState } from './types'

export interface ExistingCatalogueRecord {
  externalId: string
  title: string
  mediaType?: AnimeMediaType
  region?: AnimeRegion
  year?: number
}

interface ServiceAccountConfig {
  project_id: string
  client_email: string
  private_key: string
}

export interface AnimeSyncStore {
  getSourceMappings(keys: Array<{ provider: string; providerItemId: string }>): Promise<Map<string, SourceMapping>>
  getStates(externalIds: string[]): Promise<Map<string, SyncState>>
  publish(writes: PreparedCanonicalWrite[], mappings: SourceMapping[]): Promise<void>
  listCatalogue(): Promise<ExistingCatalogueRecord[]>
  listAllSourceMappings(): Promise<Array<{ documentId: string; mapping: SourceMapping }>>
  findProgressExternalIds(externalIds: string[]): Promise<string[]>
  deleteCatalogue(externalIds: string[]): Promise<void>
  deleteInternalMetadata(externalIds: string[], mappingDocumentIds: string[]): Promise<void>
  getCheckpoint?(checkpointId: string): Promise<SyncCheckpoint | null>
  saveCheckpoint?(checkpointId: string, checkpoint: SyncCheckpoint): Promise<void>
  getCatalogueMetrics?(sampleSize?: number): Promise<CatalogueStorageMetrics>
}

function readServiceAccount(env: NodeJS.ProcessEnv): ServiceAccountConfig | null {
  const value = env.EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const data = parsed as Record<string, unknown>
    return typeof data.project_id === 'string' && typeof data.client_email === 'string' && typeof data.private_key === 'string'
      ? { project_id: data.project_id, client_email: data.client_email, private_key: data.private_key } : null
  } catch { return null }
}

export function createAnimeAdminFirestore(env: NodeJS.ProcessEnv = process.env): Firestore | null {
  const serviceAccount = readServiceAccount(env)
  if (!serviceAccount) return null
  const app = getApps().find((candidate) => candidate.name === 'edenos-anime-sync') ?? initializeApp({
    credential: cert({ projectId: serviceAccount.project_id, clientEmail: serviceAccount.client_email, privateKey: serviceAccount.private_key }),
  }, 'edenos-anime-sync')
  return getFirestore(app)
}

async function getAllInChunks(firestore: Firestore, paths: string[], chunkSize = 300) {
  const snapshots = []
  for (let index = 0; index < paths.length; index += chunkSize) {
    const references = paths.slice(index, index + chunkSize).map((path) => firestore.doc(path))
    if (references.length) snapshots.push(...await firestore.getAll(...references))
  }
  return snapshots
}

function cataloguePayload(canonical: CanonicalAnime, write: PreparedCanonicalWrite) {
  return {
    ...canonical.index,
    indexHash: write.indexHash,
    detailHash: write.detailHash,
    updatedAt: Timestamp.fromMillis(write.updatedAtMs),
    lastSyncedAt: FieldValue.serverTimestamp(),
  }
}

export function createAnimeSyncStore(firestore: Firestore): AnimeSyncStore {
  async function commitDeletes(paths: string[]): Promise<void> {
    for (let index = 0; index < paths.length; index += 200) {
      const batch = firestore.batch()
      for (const path of paths.slice(index, index + 200)) batch.delete(firestore.doc(path))
      await batch.commit()
    }
  }
  return {
    async getSourceMappings(keys) {
      const ids = keys.map((key) => sourceMappingId(key.provider, key.providerItemId))
      const snapshots = await getAllInChunks(firestore, ids.map((id) => `animeSyncSourceMap/${id}`))
      const result = new Map<string, SourceMapping>()
      for (const snapshot of snapshots) {
        if (!snapshot.exists) continue
        const data = snapshot.data()!
        if (typeof data.provider !== 'string' || typeof data.providerItemId !== 'string' || typeof data.canonicalExternalId !== 'string') continue
        result.set(snapshot.id, { provider: data.provider, providerItemId: data.providerItemId, canonicalExternalId: data.canonicalExternalId, matchedBy: data.matchedBy })
      }
      return result
    },
    async getStates(externalIds) {
      const snapshots = await getAllInChunks(firestore, externalIds.map((id) => `animeSyncState/${id}`))
      const result = new Map<string, SyncState>()
      for (const snapshot of snapshots) {
        if (!snapshot.exists) continue
        const data = snapshot.data()!
        const updatedAtMs = data.updatedAt && typeof data.updatedAt.toMillis === 'function' ? data.updatedAt.toMillis() : 0
        if (typeof data.indexHash === 'string' && typeof data.detailHash === 'string' && updatedAtMs > 0) {
          result.set(snapshot.id, { externalId: snapshot.id, indexHash: data.indexHash, detailHash: data.detailHash, updatedAtMs })
        }
      }
      return result
    },
    async publish(writes, mappings) {
      const operations: Array<(batch: FirebaseFirestore.WriteBatch) => void> = []
      for (const write of writes) {
        if (write.indexChanged || write.r2Changed) operations.push((batch) => batch.set(firestore.doc(`animes/${write.canonical.externalId}`), cataloguePayload(write.canonical, write), { merge: true }))
        if (write.indexChanged || write.r2Changed) operations.push((batch) => batch.set(firestore.doc(`animeSyncState/${write.canonical.externalId}`), {
          indexHash: write.indexHash,
          detailHash: write.detailHash,
          updatedAt: Timestamp.fromMillis(write.updatedAtMs),
          lastSyncedAt: FieldValue.serverTimestamp(),
        }, { merge: true }))
      }
      for (const mapping of mappings) operations.push((batch) => batch.set(firestore.doc(`animeSyncSourceMap/${sourceMappingId(mapping.provider, mapping.providerItemId)}`), {
        ...mapping,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true }))
      for (let index = 0; index < operations.length; index += 200) {
        const batch = firestore.batch()
        for (const operation of operations.slice(index, index + 200)) operation(batch)
        await batch.commit()
      }
    },
    async listCatalogue() {
      const snapshot = await firestore.collection('animes').get()
      return snapshot.docs.map((document) => {
        const data = document.data()
        return {
          externalId: document.id,
          title: typeof data.title === 'string' ? data.title : '',
          ...(typeof data.mediaType === 'string' ? { mediaType: data.mediaType as AnimeMediaType } : {}),
          ...(typeof data.region === 'string' ? { region: data.region as AnimeRegion } : {}),
          ...(typeof data.year === 'number' ? { year: data.year } : {}),
        }
      })
    },
    async listAllSourceMappings() {
      const snapshot = await firestore.collection('animeSyncSourceMap').get()
      return snapshot.docs.flatMap((document) => {
        const data = document.data()
        if (typeof data.provider !== 'string' || typeof data.providerItemId !== 'string' || typeof data.canonicalExternalId !== 'string') return []
        return [{ documentId: document.id, mapping: { provider: data.provider, providerItemId: data.providerItemId, canonicalExternalId: data.canonicalExternalId, matchedBy: data.matchedBy } }]
      })
    },
    async findProgressExternalIds(externalIds) {
      const requested = new Set(externalIds)
      const found = new Set<string>()
      if (!requested.size) return []
      const snapshot = await firestore.collectionGroup('animeWatchProgress').get()
      for (const document of snapshot.docs) {
        const externalId = document.data().externalId
        if (typeof externalId === 'string' && requested.has(externalId)) found.add(externalId)
      }
      return [...found].sort()
    },
    async deleteCatalogue(externalIds) {
      await commitDeletes(externalIds.map((externalId) => `animes/${externalId}`))
    },
    async deleteInternalMetadata(externalIds, mappingDocumentIds) {
      await commitDeletes([
        ...externalIds.map((externalId) => `animeSyncState/${externalId}`),
        ...mappingDocumentIds.map((documentId) => `animeSyncSourceMap/${documentId}`),
      ])
    },
    async getCheckpoint(checkpointId) {
      const snapshot = await firestore.doc(`animeSyncControl/${checkpointId}`).get()
      if (!snapshot.exists) return null
      const data = snapshot.data()!
      if (data.version !== 1 || !Number.isInteger(data.providerIndex) || !Number.isInteger(data.categoryIndex) || !Number.isInteger(data.page) || !Number.isInteger(data.offset)) return null
      const updatedAtMs = data.updatedAt && typeof data.updatedAt.toMillis === 'function' ? data.updatedAt.toMillis() : 0
      return {
        version: 1,
        providerIndex: data.providerIndex,
        categoryIndex: data.categoryIndex,
        page: data.page,
        offset: data.offset,
        updatedAtMs,
        complete: data.complete === true,
      }
    },
    async saveCheckpoint(checkpointId, checkpoint) {
      await firestore.doc(`animeSyncControl/${checkpointId}`).set({
        ...checkpoint,
        updatedAt: Timestamp.fromMillis(checkpoint.updatedAtMs),
      })
    },
    async getCatalogueMetrics(sampleSize = 100) {
      const collection = firestore.collection('animes')
      const [countSnapshot, sample] = await Promise.all([
        collection.count().get(),
        collection.limit(Math.max(1, Math.min(sampleSize, 500))).get(),
      ])
      const sizes = sample.docs.map((document) => Buffer.byteLength(JSON.stringify({ id: document.id, ...document.data() }), 'utf8'))
      return {
        count: countSnapshot.data().count,
        sampleCount: sizes.length,
        averageDocumentBytes: sizes.length ? Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length) : 0,
        minimumDocumentBytes: sizes.length ? Math.min(...sizes) : 0,
        maximumDocumentBytes: sizes.length ? Math.max(...sizes) : 0,
      }
    },
  }
}
