# EdenOS V2 architecture decisions

This document records implementation decisions for the September 2026 V2 development cycle. Production release remains gated until all six phases and the final regression pass are complete.

## Phase 1 — Home / Dashboard V2

- Home derives summaries from the existing `RecordsProvider`, user settings, Anime progress, and bounded Anime repository queries. No dashboard collection was introduced.
- Signed budget remaining is canonical: monthly budget minus monthly expenses. Negative values represent overspending.
- Mobile uses one prioritized flow; desktop promotes the four primary domains into a two-column summary layout. Detailed pages remain authoritative.
- Known debt retained by design: `RecordsProvider` subscribes to all historical Finance and Exercise records at app startup. V2 does not add duplicate Home subscriptions or expand into pagination work.

## Phase 2 — Global Command / Search

- Commands are deterministic navigation, search, and capture shortcuts rather than a chatbot.
- Parsing creates in-memory Finance candidates or opens an Exercise form. Repository writes occur only after the existing review UI and an explicit confirmation.
- The palette is route-independent and lazy-loaded. Anime search remains bounded and delegates to the catalogue page for full results.

## Phase 3 — Anime UX V2

- Existing progress is authoritative for Continue Watching and My List. My List adds `planned` without creating an event log.
- New-title queries use `firstPublishedAt`. The sync writes it only for newly discovered, previously unmapped canonicals; no historical value is fabricated and no backfill is required.
- A successful controlled incremental run publishes `animeCatalogueStatus/current` with only catalogue count and last-success time. Provider, checkpoint, workflow, and R2 details remain private.
- Home and Anime use bounded title queries and server-side counts. Heavy detail, episode, and playback data remain in R2.

## Phase 4 — Finance Intelligence

- `users/{uid}/financeRules/{ruleId}` stores only normalized matching rules. Rules are owner-readable/writable, explicitly created, individually enabled/disabled, and never applied retroactively.
- Exact normalized matching is the default. `contains` exists only as an explicit user choice. The repeated-categorization suggestion threshold is a domain constant (`3`), not a schema concern.
- Rules influence the category on an in-memory command candidate; the user still reviews and confirms the transaction before the authoritative Records repository writes it.
- Month Story is deterministic and derived from existing records/settings. Budget remaining is signed (`budget - expenses`); UI attention state is separate from the underlying value.
- Finance Rules add one UID-scoped subscription at authenticated app startup. They are also included in the conservative Guest-to-Google data-loss check.

## Phase 5 — Life Layer

- Exercise consistency, weekly comparison, active days, streak, and personal bests are derived from existing Exercise records. A best is shown only when its required duration/distance data exists; no health advice is inferred.
- Records aggregates Finance, Exercise, and each Anime title's latest progress update client-side. No cross-domain activity collection or event log was created.
- Weekly Review combines derived Finance, Exercise, and latest Anime progress context. Anime language intentionally says a title “progressed” and does not claim exact episode history.
- `users/{uid}/weeklyReviews/{weekKey}` stores only `wentWell`, `improve`, `nextFocus`, and `updatedAt`. The selected week document is read only while the Weekly Review route is open; domain summaries are not duplicated.
- Saved reflections are included in the conservative Guest-to-Google data-loss check.
