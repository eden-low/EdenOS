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
