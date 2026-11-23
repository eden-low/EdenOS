# Little Eden Part 1–4 — approved release candidate

**Part 4 — Closed at approved release scope.**

**Remaining animation enhancements — Deferred.**

**Part 5–8 — Not Started.**

Current release state: **Production approval required; not Production Released.**
The owner accepted current Staging behavior, including all three 4G prototypes
as-is. That scope acceptance is distinct from approval to merge a specific Release
PR/SHA into main. Stop after preparing that PR and verifying its Staging candidate.
Do not merge, auto-merge, deploy Production or roll back without the next explicit
approval. Future "Production Released" status requires actual main release and
matching Ready deployment; it is not recorded prematurely here.

## Included scope

- Today original Eden, blink and existing Capture move/perch/return.
- About Eden, its existing Smile/Think/Wave and Chinese personal copy.
- Thirteen static identities; About's independent Wardrobe Gallery and controls.
- Expenses Treasurer, Records Archivist, left-corner native-right Review Reflector,
  prone Anime Watching with player occlusion, deterministic per-tab Exercise
  Swim/Boxing entry alternation, and six Cosmos systems mapped to six forms.
- Accepted route/deep-link/history, layout/safe-area, Reduced Motion, static
  fallback, lifecycle, privacy/modality and PWA behavior.
- Current **Treasurer blink + subtle abacus motion**, **Archivist blink + page-turn**
  and **Reflector blink + journal motion**, retained exactly as accepted. No
  secondary action is removed, disabled, retimed or replaced.

The owner's 23 November 2026 release instruction supersedes historical delivery
Pending labels for these current implementations. Source-art manifest/draft labels
remain historical provenance. Acceptance does not mean all original animation
requirements were completed. The three phase handoffs and Part 4 plan now record
the current decision without editing runtime metadata, tests, assets or timings.

## Excluded / Deferred

- New Watching/Swim/Boxing/Cosmos blink or prop animation frames.
- More distinct Treasurer bead calculation, richer Archivist clipboard/page work,
  Reflector continuous multi-stroke handwriting or other refinements beyond the
  accepted key-pose sequences. Existing subtle secondary actions stay enabled.
- New wardrobe animation, clothes, sounds, global events or scene performances.
- Part 5–8, business/data/schema changes, Auth/Guest changes, Firebase/Netlify
  environment edits, Firestore Rules/credentials, actual user mutations, paid APIs.
- Fixing or claiming a root cause for the known Anime Player close → Today Capture
  missing-perch/anchor observation. It remains a disclosed Known Risk.

## History preservation and exact source comparison

Accepted Staging baseline:
`cbbbd402a229fd173de0931be9c44cbb4e8db8f7`.
Production main baseline:
`f4b0b26b2398f040576fa01c81a9ef542407e389`.
Common ancestor:
`761062386ce0f5a82a3c2a8cfbd608f98fdc5fa0`.

Staging has 19 unique Little Eden commits. Main has four unique released merge
commits, all retained by ancestry:

- `d8475c42965902309a4a9dafcb344a41d86e63a6` (PR #19).
- `caa71c24c2346743817d0f8fde73afc9110b5ac3` (PR #21).
- `08fd41e11c053bb2dad6ac55375437ed35e76656` (PR #23).
- `f4b0b26b2398f040576fa01c81a9ef542407e389` (PR #25).

An isolated `release/little-eden-part1-4-20261123` worktree starts from current
main and merges accepted Staging with **two parents**, without reset, force push,
squash or conflict resolution. `git merge-tree --write-tree` and the actual merge
index both produced `83aed1beed9b240c6d6bc5e37fe6b5b34b7c4f5f`, exactly the accepted
Staging root tree. Thus no main-only code is lost; the main-only merge history is
preserved too. Main's current tree also matches its already-published second
parent/common ancestor. The candidate adds only release/acceptance documentation.

Release preparation introduces **no runtime changes** relative to accepted
Staging: frontend source, tests, scripts, binaries, dependencies, build config,
Functions, Auth/Guest/Genesis, financial logic and Rules remain identical.
No material is regenerated. Candidate main/staging ancestry and this source
equality are checked again before promotion and in the Release PR evidence.

Use a merge commit for the eventual approved Release PR. Do not squash/rebase away
the retained Staging history. If base/head/scope changes materially, re-review and
obtain approval for the new exact candidate.

## Changed-file audit

The main → accepted Staging delta is **147 files**, all within the accepted
Little Eden frontend, tests/QA, assets and handoffs. There are 11 modified existing
paths; the rest are additions. The release adds this handoff and a machine-readable
[complete file manifest](evidence/little-eden-release-candidate.json). The Release
PR body also lists every final changed path.

Existing runtime modifications were reviewed: App route-backed selection/lazy
About/avatar scope; Capture anchor publishing; Today-only global + and About nav;
Review's `data-avatar-priority` on Save; shared Cosmos selection; route/history
restoration and `/review` alias; and accepted PWA image precache patterns.
Review save/read and financial draft/confirm code are not changed by those UI
attributes/anchors. Modified Privacy Lock files are tests, not its provider logic.

Protected paths have **no main → Staging changes**: backend Functions, Firebase
initialization, boot/auth/state logic, Rules, firebase.json, .firebaserc,
netlify.toml, package/lockfiles, and GitHub workflows. No raw original PNG/ZIP,
credential, local QA fixture or owner data is introduced by this release.

Release-only edits are the Part 4 plan, 4G-A/B1/B2 handoff acceptance notes,
this handoff and the file/evidence manifest. Other worktrees remain untouched.

## Fresh validation and evidence

Tests are rerun from the isolated merged candidate with a fresh `npm ci`; historical
phase counts are not substituted for this run. Only synthetic repositories,
fresh browser profiles and the demo Firestore Emulator are used. Real Google/
Guest auth operations, Guest sign-out, Review/workout/finance saves and paid APIs
are not exercised.

- Full Vitest: **204 files / 1,622 tests passed** in this release run.
- TypeScript `tsc -b`, `npm run lint`, production-mode `npm run build`: passed.
  Repository lint is **Oxlint**, not ESLint. No separate ESLint configuration or
  executable is supplied by the project; it was not added or claimed to pass.
- Firestore Emulator ownership/data-isolation/finance/review/settings rules passed.
- Five Netlify Functions packages passed: weather, receipt-ocr,
  fitness-screenshot, batch-transactions-screenshot and cosmos-reading.
- Fresh browser suites: Today/Capture, all-page layout/scroll/click-through,
  route/history/deep links, Finance Lock/PIN-like modal priority, Account/Genesis,
  player/fullscreen, About gestures, 13-look wardrobe, Exercise entry parity,
  Cosmos six local systems, and Treasurer/Archivist/Reflector motion checks.
  Motion audits include real wall-clock frames, no overlap, failure/static
  fallback/reconnect, Reduced Motion, hidden/frozen/restore, stale load/unmount,
  static wardrobe isolation, Review direction and Save hit testing without saving.
- Production PWA offline/update is run via the accepted guarded synthetic-provider
  build, including explicit waiting-worker update, obsolete cache replacement,
  cached role assets/gestures, three motion roles and authenticated synthetic
  offline navigation: **passed**. Its 53→53 cache update removes obsolete JS without
  automatic reload; all 13 wardrobe looks, six Cosmos forms, four Exercise refresh
  entries, eight offline deep-link/reload routes and eight Today Capture cycles
  passed. No atlas decodes on initial About. New normal build has 53 precache
  entries / 4,846.83 KiB; the provider-stub PWA has 53 / 4,657.83 KiB.
  Matching same-SHA GitHub CI / Staging Ready identifiers are attached to the
  Release PR and final report after candidate promotion.

Logs/reports are in ignored `frontend/artifacts/little-eden-release-*.log` and
`frontend/artifacts/browser-validation/`. Existing large-chunk build warnings and
unrelated AnimeProgress `act` advisories remain distinct from failures. No broad
refactor is made to eliminate advisories or the Known Risk during release.

## Actual Staging and Production references

Accepted baseline Staging was Ready at deploy `6b030ac7c7ebeeafc4d60c5f`, CI
[45038771677](https://github.com/eden-low/EdenOS/actions/runs/45038771677).
The final candidate is promoted **only to Staging** for an exact same-SHA CI,
Ready/build-metadata, asset hash, manifest/worker/cache and unauthenticated-guard
check. Actual Google/Guest acceptance belongs on the authorized Staging origin,
never on a Deploy Preview. New candidate SHA/deploy/CI are in the formal PR.

Current Production / verified rollback deploy:
**`6afde0c0845874dbc898c475`**, Ready at main
`f4b0b26b2398f040576fa01c81a9ef542407e389`, published 18 November 2026.
Read-only verification checked Production and its immutable permalink
`https://6afde0c0845874dbc898c475--edenos.netlify.app`: HTML and referenced assets
return 200, asset hashes match current Production, and the unauthenticated screen
shows enabled Google/Guest entries. No login button was clicked and no rollback,
deploy or owner-account operation was performed. Artifact availability is verified;
restoration is not executed or automatically authorized.

## Firebase parity and manual acceptance limits

**Firebase parity: Not verified.** Read-only Netlify API checks confirmed six
site-level Firebase keys and Production/branch-deploy contexts, with no branch
override. Non-local secret responses were not usable validated Firebase settings;
comparing protected representations is not proof of actual deployed-value parity.
No values were printed/exported or changed. [Netlify's environment API](https://open-api.netlify.com/#tag/environmentVariables/operation/getEnvVar)
documents restricted access for secret non-local values. Owner approval must not
mistake configured context presence or an unauthenticated screen for parity.

Current implementation/scope is owner-accepted. Fresh final-candidate real Google/
Guest sign-in and signed-in restore, owner PIN, iPhone Safari, installed iPhone
PWA and desktop **manual** checks remain Pending; synthetic Chromium evidence does
not certify them. No valuable Guest identity should be abandoned for testing.

Manual release checklist: all page corners/outfits; Today +/Capture return and the
known Anime-close flow; About gestures/13-look controls; Exercise parity; Cosmos
selection; three accepted motion prototypes; keyboard/landscape/safe areas,
Reduced Motion, lock/PIN/Genesis, background/restore, deep-link/reload/history,
PWA installation/explicit update/offline and reconnect/auth safety.

## Known Risks and next approval

The intermittent Anime Player close → Today Capture may open a sheet without
normal perch/anchor animation. It was reproduced during B2 and predates this
release preparation. Passing a new run does not establish a root cause or fix.
It stays Known Risk, accepted for this scope only as disclosed by the owner.
This release's unchanged cross-page suite, isolated Today and production-mode PWA
Capture cycles passed without reproducing it; no test retry shortcut or Capture
code modification was introduced.

Secondary motions can be subtle, Reflector has approved candidate clothing
differences, and its writing pose is not continuous multi-stroke handwriting.
These are accepted current behavior; additional enhancement work is Deferred.
Firebase parity and fresh real-device/auth checks are explicit outstanding items.

After all required checks, create the formal main-base Release PR with Included /
Excluded scope, complete file list, preservation proof, actual test/deploy results,
Known Risks and rollback. **Then stop for explicit approval of that PR/head SHA.**
No Production Released status, main merge, auto-merge, Production deployment,
automatic rollback or Part 5–8 work is authorized by release preparation.
