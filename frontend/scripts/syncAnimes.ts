import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProviderConfigs, parseSyncOptions, selectProviderConfigs } from '../sync/anime/config'
import { createAnimeAdminFirestore, createAnimeSyncStore } from '../sync/anime/firebaseAdminStore'
import { createMacCmsProvider } from '../sync/anime/macCmsProvider'
import { createR2AnimeDetailStore, readR2Configuration } from '../sync/anime/r2Store'
import { runAnimeSync } from '../sync/anime/runner'

function printSummary(summary: Awaited<ReturnType<typeof runAnimeSync>>['summary'], dryRun: boolean): void {
  const prefix = dryRun ? 'Would write' : 'Written'
  console.log([
    `Run ID: ${summary.runId}`,
    `Mode: ${summary.mode}`,
    `Providers: ${summary.providers.join(', ')}`,
    `Fetched: ${summary.fetched}`,
    `Normalized: ${summary.normalized}`,
    `Canonical titles: ${summary.canonicalTitles}`,
    `Merged duplicates: ${summary.mergedDuplicates}`,
    `${prefix} R2: ${summary.r2Uploaded}`,
    `R2 skipped: ${summary.r2Skipped}`,
    `${prefix} Firestore: ${summary.firestoreUpserted}`,
    `Firestore skipped: ${summary.firestoreSkipped}`,
    `Provider failures: ${summary.providerFailures}`,
    `Item failures: ${summary.itemFailures}`,
    `Ambiguous matches: ${summary.ambiguousMatches}`,
    `Unsupported playback URLs: ${summary.unsupportedPlaybackUrls}`,
    `Elapsed: ${summary.elapsedMs}ms`,
  ].join('\n'))
}

async function main(): Promise<void> {
  const options = parseSyncOptions(process.argv.slice(2))
  const configs = selectProviderConfigs(loadProviderConfigs(), options.providerIds)
  if (!configs.length) throw new Error('Set ANIME_SYNC_PROVIDERS and per-provider BASE_URL variables before running sync')
  const providers = configs.map((config) => createMacCmsProvider(config))
  const firestore = createAnimeAdminFirestore()
  const r2Config = readR2Configuration()
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.cache/anime-sync')
  const result = await runAnimeSync(options, {
    providers,
    cacheRoot: root,
    ...(firestore ? { store: createAnimeSyncStore(firestore) } : {}),
    ...(r2Config ? { detailStore: createR2AnimeDetailStore(r2Config) } : {}),
    log: console.log,
  })
  for (const probe of result.probes) console.log(`${probe.providerId}: ${probe.reachable ? 'OK' : 'FAILED'} — ${probe.message}`)
  if (options.dryRun) {
    for (const canonical of result.canonicals.slice(0, 3)) console.log(`Sample: ${canonical.externalId} — ${canonical.index.title} — ${canonical.detail.episodes.length} episodes`)
  }
  printSummary(result.summary, options.dryRun)
  if (!options.dryRun && result.summary.canonicalTitles > 0 && result.summary.firestoreUpserted === 0 && result.failures.some((failure) => failure.stage === 'r2')) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Anime sync failed')
  process.exitCode = 1
})
