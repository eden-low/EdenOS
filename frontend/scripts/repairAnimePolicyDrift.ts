import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Timestamp } from 'firebase-admin/firestore'
import { loadProviderConfigs } from '../sync/anime/config'
import { createAnimeAdminFirestore, createAnimeSyncStore } from '../sync/anime/firebaseAdminStore'
import { createMacCmsProvider } from '../sync/anime/macCmsProvider'
import { createR2AnimeDetailStore, readR2Configuration } from '../sync/anime/r2Store'
import { AnimeRawCache } from '../sync/anime/rawCache'
import { runAnimeSync } from '../sync/anime/runner'

function argument(name: string): string {
  const raw = process.argv.slice(2).find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3)
  if (!raw) throw new Error(`--${name}=ISO_TIMESTAMP is required`)
  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp)) throw new Error(`--${name} must be an ISO timestamp`)
  return new Date(timestamp).toISOString()
}

async function main(): Promise<void> {
  const since = argument('since')
  const before = argument('before')
  if (Date.parse(before) <= Date.parse(since)) throw new Error('--before must be after --since')
  const firestore = createAnimeAdminFirestore()
  const r2 = readR2Configuration()
  if (!firestore || !r2) throw new Error('Policy repair requires Firebase Admin and R2 configuration')
  const snapshots = await firestore.collection('animes')
    .where('lastSyncedAt', '>=', Timestamp.fromDate(new Date(since)))
    .where('lastSyncedAt', '<', Timestamp.fromDate(new Date(before)))
    .get()
  if (snapshots.empty) throw new Error('Policy repair window matched no catalogue titles')
  if (snapshots.size > 10) throw new Error(`Policy repair refuses an unbounded window (${snapshots.size} titles matched)`)

  const mappings = (await Promise.all(snapshots.docs.map(async (document) => {
    const matches = await firestore.collection('animeSyncSourceMap').where('canonicalExternalId', '==', document.id).get()
    return matches.docs.flatMap((mapping) => {
      const data = mapping.data()
      return typeof data.provider === 'string' && typeof data.providerItemId === 'string'
        ? [{ provider: data.provider, providerItemId: data.providerItemId }]
        : []
    })
  }))).flat()
  if (!mappings.length) throw new Error('Policy repair found no source mappings for the bounded catalogue window')

  const providers = loadProviderConfigs().map((config) => createMacCmsProvider(config))
  const byProvider = new Map(providers.map((provider) => [provider.config.id, provider]))
  const cacheRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.cache/anime-sync')
  const cacheId = `policy-repair-${Date.now()}`
  const cache = new AnimeRawCache(cacheRoot, cacheId)
  for (const providerId of new Set(mappings.map((mapping) => mapping.provider))) {
    const provider = byProvider.get(providerId)
    if (!provider) throw new Error(`Policy repair source provider is not configured: ${providerId}`)
    const ids = [...new Set(mappings.filter((mapping) => mapping.provider === providerId).map((mapping) => mapping.providerItemId))]
    for (let index = 0; index < ids.length; index += 20) {
      const detail = await provider.fetchDetails(ids.slice(index, index + 20))
      for (const item of detail.items) await cache.writeDetail(providerId, String(item.vod_id), { list: [item] })
    }
  }

  const store = createAnimeSyncStore(firestore)
  const detailStore = createR2AnimeDetailStore(r2)
  const options = {
    mode: 'incremental' as const,
    dryRun: false,
    fromCache: path.join(cacheRoot, 'raw', cacheId),
    probeOnly: false,
    probeMedia: false,
    concurrency: 3,
    cleanup: 'none' as const,
    applyContentPolicy: true,
    maxFirestoreReads: 30_000,
    maxFirestoreWrites: 12_000,
    operationSafetyMargin: 100,
  }
  const repaired = await runAnimeSync(options, { providers, cacheRoot, store, detailStore })
  const replay = await runAnimeSync(options, { providers, cacheRoot, store, detailStore })
  console.log(`Policy repair window: ${since} to ${before}`)
  console.log(`Policy repair targets/source mappings: ${snapshots.size}/${mappings.length}`)
  console.log(`Policy repair Firestore reads/writes and R2 reads/writes: ${repaired.summary.operations.firestoreReads}/${repaired.summary.operations.firestoreWrites}/${repaired.summary.operations.r2Reads}/${repaired.summary.operations.r2Writes}`)
  console.log(`Policy repair replay Firestore writes/R2 writes: ${replay.summary.operations.firestoreWrites}/${replay.summary.operations.r2Writes}`)
  if (repaired.summary.operations.r2Writes !== 0) throw new Error('Policy repair unexpectedly changed R2 content')
  if (replay.summary.operations.firestoreWrites !== 0 || replay.summary.operations.r2Writes !== 0) throw new Error('Policy repair replay was not idempotent')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
