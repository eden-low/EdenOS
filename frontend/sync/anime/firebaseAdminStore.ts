import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { sourceMappingId } from './identity'
import type { CanonicalAnime, PreparedCanonicalWrite, SourceMapping, SyncState } from './types'

interface ServiceAccountConfig {
  project_id: string
  client_email: string
  private_key: string
}

export interface AnimeSyncStore {
  getSourceMappings(keys: Array<{ provider: string; providerItemId: string }>): Promise<Map<string, SourceMapping>>
  getStates(externalIds: string[]): Promise<Map<string, SyncState>>
  publish(writes: PreparedCanonicalWrite[], mappings: SourceMapping[]): Promise<void>
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
  }
}
