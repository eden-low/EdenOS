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

### Multi-goal and multi-budget extension

- `users/{uid}/financeGoals/{goalId}` stores goal identity, target, current allocated balance, optional date, and active/archive state. The legacy `settings/preferences.savingsGoalSen` is surfaced as a synthetic goal until its first edit or contribution creates the deterministic `legacy-savings-goal` document. No release migration or production mutation is required.
- `users/{uid}/financeGoalAllocations/{allocationId}` is append-only and records positive allocations. A contribution updates the goal balance and creates its allocation event in one Firestore transaction. An “Already saved” opening balance initializes goal progress without creating a current-month allocation event. Allocations are not Expenses and never enter expense category totals.
- `users/{uid}/financeBudgets/{budgetId}` stores a monthly planning amount and optional Expense category. Category spending is derived from authoritative Expense records; transaction totals are not copied into budget documents.
- Monthly net cashflow remains `income - actual expenses`. Goal allocations are reported separately. Available/unallocated money is `income - actual expenses - goal allocations`, so the same money is not counted twice.
- Overall budget remaining stays signed: `overall monthly limit - actual expenses`. Pot remaining is also signed: `pot amount - matching category expenses`. Unlinked pots are planning-only and do not claim derived spending.
- Goal and budget lists add two UID-scoped subscriptions. Allocation reads are bounded to the displayed reporting month. All three collections are included in the conservative Guest-to-Google data-loss check.

## Phase 5 — Life Layer

- Exercise consistency, weekly comparison, active days, streak, and personal bests are derived from existing Exercise records. A best is shown only when its required duration/distance data exists; no health advice is inferred.
- Records aggregates Finance, Exercise, and each Anime title's latest progress update client-side. No cross-domain activity collection or event log was created.
- Weekly Review combines derived Finance, Exercise, and latest Anime progress context. Anime language intentionally says a title “progressed” and does not claim exact episode history.
- `users/{uid}/weeklyReviews/{weekKey}` stores only `wentWell`, `improve`, `nextFocus`, and `updatedAt`. The selected week document is read only while the Weekly Review route is open; domain summaries are not duplicated.
- Saved reflections are included in the conservative Guest-to-Google data-loss check.

## Phase 6 — Dashboard Customization

- Layout preferences use `edenos.dashboard.v1:{uid}` in device-local storage. They contain only section order and hidden section IDs; Privacy Lock and cloud preferences are unchanged.
- The default order remains Finance, Exercise, Anime, Weekly Review, Records, Calendar. Mobile is always one column and desktop remains a responsive two-column flow.
- Reordering and visibility changes are available only inside explicit Edit Dashboard mode, use touch-sized move controls, and include a reset-to-default action. No grid, resizing, or drag-and-drop dependency was introduced.
