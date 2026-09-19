import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProviderConfigs, parseSyncOptions, selectProviderConfigs } from '../sync/anime/config'
import { createAnimeAdminFirestore, createAnimeSyncStore } from '../sync/anime/firebaseAdminStore'
import { createMacCmsProvider } from '../sync/anime/macCmsProvider'
import { createR2AnimeDetailStore, readR2Configuration } from '../sync/anime/r2Store'
import { runAnimeSync } from '../sync/anime/runner'
import { applyAnimeCleanup, planAnimeCleanup } from '../sync/anime/cleanup'

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
    `Accepted Japanese Anime: ${summary.contentAccepted.japan}`,
    `Accepted Chinese Anime: ${summary.contentAccepted.china}`,
    `Accepted Western Anime: ${summary.contentAccepted.europe_us}`,
    `Commentary rejected: ${summary.commentaryRejected}`,
    `Other content rejected: ${summary.otherRejected}`,
    ...Object.entries(summary.providerStats).map(([provider, stats]) => `${provider} requests/retries/failures: ${stats.requests}/${stats.retries}/${stats.failures}`),
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
  const store = firestore ? createAnimeSyncStore(firestore) : undefined
  const detailStore = r2Config ? createR2AnimeDetailStore(r2Config) : undefined
  if (options.cleanup !== 'none') {
    if (!store) throw new Error('Cleanup planning requires Firebase Admin configuration')
    const plan = await planAnimeCleanup(store, providers, options.concurrency)
    console.log(`Cleanup existing/keep/remove/commentary/other: ${plan.total}/${plan.keep}/${plan.remove}/${plan.commentary}/${plan.otherNonAnime}`)
    for (const item of plan.classifications) console.log(`Cleanup ${item.action.toUpperCase()}: ${item.externalId} | ${item.reason} | ${item.title}`)
    console.log(`Cleanup source mappings: ${plan.removeMappingDocumentIds.length}`)
    console.log(`Orphaned progress externalIds: ${plan.orphanedProgressExternalIds.length ? plan.orphanedProgressExternalIds.join(', ') : 'none'}`)
    if (options.cleanup === 'apply' && !options.dryRun) {
      if (!detailStore) throw new Error('Live cleanup requires R2 write configuration')
      await applyAnimeCleanup(plan, store, detailStore)
      console.log(`Cleanup applied: ${plan.remove} catalogue and R2 records removed`)
    } else console.log('Cleanup plan only: zero deletes')
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', '.cache/anime-sync')
  const result = await runAnimeSync(options, {
    providers,
    cacheRoot: root,
    ...(store ? { store } : {}),
    ...(detailStore ? { detailStore } : {}),
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
