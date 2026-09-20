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
start with an unrestricted full import. The GitHub workflow is manual and
defaults to dry-run mode; set either a small item limit or bounded content
group targets explicitly.

Other supported commands:

```bash
npm run sync:animes -- --mode=full
npm run sync:animes -- --from-cache=.cache/anime-sync/raw/RUN_ID --dry-run
npm run sync:animes -- --retry-failed=.cache/anime-sync/failed/RUN_ID.json --dry-run
npm run sync:animes -- --probe-media --limit=5 --dry-run
npm run sync:animes -- --dry-run --cleanup=plan --providers=providerA,providerB --content-targets=japan:300,china:200,europe_us:100 --concurrency=3
npm run sync:animes -- --dry-run --providers=providerA,providerB --content-groups=china_anime:250,east_asia_anime:550,western_anime:150,hong_kong_taiwan_anime:20,overseas_anime:20,animation_movie:10 --concurrency=3
```

## Anime content-quality import

The bounded media import discovers each provider's category tree and accepts
only the exact current categories `国产动漫`, `日韩动漫`, `欧美动漫`, `港台动漫`,
`海外动漫`, and `动画片`. It never guesses numeric type IDs. `日韩动漫` uses
the detail record's area, preserving Korea as `korea`; an unclear area remains
`other` rather than being relabeled as Japan. `动画片` is normalized as
`mediaType=movie` with the `Animation` genre marker. The other five approved
categories remain `mediaType=anime`.

`--content-targets` caps canonical output after conservative deduplication. Its
combined total cannot exceed 650. The content policy rejects commentary markers
from titles, provider categories, and `vod_class`; it never scans descriptions
for the word `解说`.

`--content-groups` is the broader, resumable import contract. It accepts the
six stable group keys shown above, caps the combined target at 9,500, and keeps
the same source maps, canonical IDs, hashes, R2-first publication order, and
idempotent skips between waves. Use increasing bounded targets rather than one
unrestricted provider import.

Cleanup must always be planned before it is applied:

```bash
npm run sync:animes -- --dry-run --cleanup=plan --providers=providerA,providerB --content-targets=japan:300,china:200,europe_us:100 --concurrency=3
npm run sync:animes -- --cleanup=apply --providers=providerA,providerB --content-targets=japan:20,china:15,europe_us:10 --concurrency=3
```

The plan lists every catalogue ID as KEEP or REMOVE and reports watch-progress
IDs that would become orphaned. Applying cleanup deletes only the explicitly
listed catalogue document, matching R2 detail object, sync state, and exclusive
source mappings. It never deletes watch progress. Cleanup order is Firestore
catalogue, R2 detail, then internal sync metadata.

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
