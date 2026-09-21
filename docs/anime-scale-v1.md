# Anime Scale Optimization V1

## Verified provider shape

The read-only provider census on 2026-09-21 inspected list pagination without
importing records:

| Provider | All media rows | Page size | Approved Anime/animation rows | Measured title/year/group identities |
| --- | ---: | ---: | ---: | ---: |
| `lzi` | 155,614 | 20 | 7,472 | 7,472 |
| `ffzy` | 98,165 | 20 | 9,698 | 9,698 |

The combined approved-category census produced 13,233 unique normalized
title/year/group identities. This is an estimate of canonical catalogue size,
not an import promise: detail normalization, shared IDs, aliases, and content
policy decisions can change the final canonical count. The providers' all-media
totals include live action, documentaries, movies, series, variety, and other
non-Anime categories and must not be treated as Anime totals.

Run the same read-only census with:

```bash
npm --prefix frontend run anime:inspect-providers -- --scan-all
```

## Operation audit

Before V1, every normalized provider row performed a deterministic source-map
document read and every canonical performed a sync-state read. A changed title
then wrote the lightweight catalogue document and sync-state document, plus a
source-map document when the provider mapping was new. An unchanged title wrote
nothing, but still issued an R2 `HEAD` after reading its prior R2 detail for
merge safety. Bounded content runs always began provider/category pagination at
page 1.

Controlled V1 traverses only the existing approved Anime/animation categories.
It checks source mappings directly from each 20-row provider page and skips
already mapped rows before detail retrieval. New/unmapped candidates continue
through canonical resolution and sync-state comparison. Identical catalogue,
state, source-map, and R2 content produces zero writes. The redundant unchanged
R2 `HEAD` is removed; the durable detail hash in sync state remains the change
detector, while the prior R2 detail is read only when it is required to preserve
other provider sources during a merge.

One controlled run reads its checkpoint once and writes it once after a live
batch. The checkpoint records provider index, approved-category index, page,
and row offset. Dry runs read but never update it. Failed detail or R2 work
rewinds the checkpoint to the first uncommitted row, making retries idempotent.

## Safety limits

The operation budgets are authoritative and configurable:

```text
MAX_FIRESTORE_WRITES=12000
MAX_FIRESTORE_READS=30000
ANIME_SYNC_OPERATION_SAFETY_MARGIN=100
```

Equivalent CLI flags are `--max-firestore-writes`,
`--max-firestore-reads`, and `--operation-safety-margin`. A secondary
`--max-titles` cap limits a run, but it never overrides an operation budget.
The runner reports its stop reason as write budget, read budget, title cap,
provider exhausted, error threshold, or complete.

Example controlled dry run:

```bash
npm run sync:animes -- --controlled --dry-run \
  --content-groups=china_anime:1,east_asia_anime:1,western_anime:1,hong_kong_taiwan_anime:1,overseas_anime:1,animation_movie:1 \
  --max-titles=100 --checkpoint-id=canary-v1 \
  --max-firestore-writes=12000 --max-firestore-reads=30000 \
  --catalogue-stats
```

Add `--verify-idempotency` to a live run to replay that run's exact raw detail
cache. The command fails if the replay performs a Firestore or R2 write.

## Browser scale posture

The browser repository remains server-paginated at 24 catalogue rows per page.
It uses Firestore cursors, server-side count aggregation, bounded title prefix
queries, and the existing composite filter indexes. The UI never loads the
complete catalogue into browser memory. Watch progress is queried only from the
current user's UID-scoped progress collection and does not scan the catalogue.

Heavy detail JSON, episode arrays, and playback sources remain in Cloudflare R2.
Firestore continues to hold only the lightweight searchable catalogue index.
