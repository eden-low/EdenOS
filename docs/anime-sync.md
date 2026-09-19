# Anime content sync V1

The Anime sync pipeline reads configured MacCMS-compatible V10 providers,
stores raw responses for replay, normalizes them into the existing EdenOS Anime
contracts, writes R2 detail objects first, and then publishes lightweight
Firestore catalogue documents.

It never discovers or hardcodes third-party provider URLs. Configure only
sources that the owner is authorized to use.

## Configuration

Server-only variables:

```dotenv
ANIME_SYNC_PROVIDERS=providerA,providerB
ANIME_PROVIDER_PROVIDERA_BASE_URL=
ANIME_PROVIDER_PROVIDERA_DISPLAY_NAME=
ANIME_PROVIDER_PROVIDERA_PRIORITY=1
ANIME_PROVIDER_PROVIDERA_TIMEOUT_MS=10000
ANIME_PROVIDER_PROVIDERA_MAX_RETRIES=2

EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

`ANIME_SYNC_PROVIDER_CONFIG_JSON` is an alternative typed provider registry for
manual CI runs. It is a JSON array containing `id`, `baseUrl`, and optional
`displayName`, `priority`, `timeoutMs`, and `maxRetries`. Never prefix Admin or
R2 credentials with `VITE_`.

The browser may separately use `VITE_ANIME_DETAILS_BASE_URL` only for an
intentionally public, read-only R2 origin.

## Safe first run

```bash
npm run sync:animes -- --probe --providers=providerA,providerB
npm run sync:animes -- --mode=incremental --dry-run --providers=providerA,providerB --limit=20
npm run sync:animes -- --mode=incremental --providers=providerA,providerB --limit=20
```

Inspect the probe and dry-run summary before the small live command. Do not
start with an unrestricted full import. The GitHub workflow is manual only and
defaults to a 20-item dry run.

Other supported commands:

```bash
npm run sync:animes -- --mode=full
npm run sync:animes -- --from-cache=.cache/anime-sync/raw/RUN_ID --dry-run
npm run sync:animes -- --retry-failed=.cache/anime-sync/failed/RUN_ID.json --dry-run
npm run sync:animes -- --probe-media --limit=5 --dry-run
```

Providers without a verified incremental parameter are safely paginated and
deduplicated through canonical content hashes. The runner does not invent an
upstream time-filter query.

## Local artifacts and recovery

Raw list and detail responses are written beneath:

```text
.cache/anime-sync/raw/{runId}/{provider}/page-0001.json
.cache/anime-sync/raw/{runId}/{provider}/details/{providerItemId}.json
.cache/anime-sync/raw/{runId}/manifest.json
.cache/anime-sync/failed/{runId}.json
```

These files are ignored by Git. A cache replay performs no upstream request.
Failure reports contain safe stages and messages without credentials.

For each changed canonical title the consistency order is:

1. Normalize and hash index/detail content.
2. Upload or verify `anime-details/{externalId}.json` in R2.
3. Upsert `animes/{externalId}` only after R2 succeeds.
4. Upsert `animeSyncSourceMap` and `animeSyncState` metadata.

Unchanged hashes skip R2 and Firestore writes. Provider failures preserve
existing objects and last-known playback sources; the sync does not interpret a
failed provider as deletion evidence.
