# Part 4G-B2 — Reflector Eden candidate motion

## Authorization and release boundary

**Owner accepted the current Treasurer, Archivist and Reflector implementations
as-is for the Little Eden Part 1–4 release scope on 23 November 2026.** This
supersedes their historical delivery Pending labels for implemented behavior only;
continuous pen strokes and other enhancements remain Deferred. Exact Production
Release PR/SHA approval is still required before any main merge or deployment.

The earlier 22 November authorization covered B2 candidate integration. Historical
`VISUAL_DRAFT_NOT_APPROVED` manifest/README labels remain source provenance and
are not rewritten. The later release decision accepts the current journal motion
despite its documented clothing differences and subtle secondary action.

Fresh baseline: staging `bd884ca96a48d577fbed5f05498697048d1b2508`, successful
[B1 CI 44908192573](https://github.com/eden-low/EdenOS/actions/runs/44908192573),
Ready deployment `6b019a21453cd2c794a03c2e` at that SHA. These are the rollback
reference; no rollback is performed. Main stays
`f4b0b26b2398f040576fa01c81a9ef542407e389`. Open PR count was zero, no conflicting
active Codex task or tracked worktree modification was found. Historical QA
artifacts in other worktrees are untouched. The root diagnostics branch remains
unchanged; development is isolated on `feature/avatar-part4g-b2-reflector`.

Read the staging-first skill and release/Firebase references, 4G-A/B1 actual
handoffs/controller/renderer, and Part 4B Reflector provenance. No applicable
AGENTS.md was found. Direct staging promotion without a PR is explicitly
authorized; Production, sensitive config, Rules, credentials, Guest/Auth and real
data are outside scope. Firebase deployed-environment parity is **not verified**.

## Authorized ZIP and source verification

`EdenOS_Part4G_B2_Reflector_Visual_Review.zip`: **6,900,599 bytes**,
SHA-256 `bdb5a0b806080d988fe23af0121ca9836c9f1792f6514be293f89995740a521d`.
Entries were checked for path traversal before extracting into ignored local
`frontend/artifacts/browser-validation/avatar-part4g-b2/source`.

All eleven entries are readable. All manifest image hashes and dimensions match
actual files. Each independent PNG is 320×900 RGBA and decoded pixels exactly
match its corresponding cell in the **1920×900, six-column** candidate sheet.
The sheet SHA is
`d43dc94b4977e44c08d4c2facd16a2250544f2d815059f85a5c509a4e11f6c9e`.
Reference and comparison PNGs are inspected only, never used as runtime cells.

| Index | Input | Pose | SHA-256 |
| --- | --- | --- | --- |
| 01 | `01_idle-think.png` | Pen near mouth, think | `ecb96b1362d3f54f6924968138e478ba9e7c2987806c5422b59d3a6aec1a5f13` |
| 02 | `02_blink-half.png` | Half blink | `10a4549b755ae8beb4976478ec3d3a559aeee6c2ccf3942cfa5f4ae813abb7e9` |
| 03 | `03_blink-closed.png` | Closed eyes | `8143a4c7e9dbbe639b0fad4e87e1aab6ff3501fa5ba03ce7ff85658748d10a51` |
| 04 | `04_journal-write.png` | Look down, writing pose | `b63450a8b2ed72d30387a2ae9bdfa17f4992332e10012bbf18834d91c0a6a5ef` |
| 05 | `05_page-turn.png` | Hand/curved paper turn | `8c2e0a1493601344b1a2bc1188e587155105397695055ca9e7283c2c0bbd2de0` |
| 06 | `06_recover-think.png` | Recover thinking | `054b298bdfa2d718ebb311af6f8a567bc8e259881416197b706494762c42dc21` |

Visual review covered the full sheet, approved comparison, flattened light/dark
individual frames and native 88×164 before/after-export previews. Curls, glasses,
wing, journal/pen, bag/cat and complete shoes remain; faces/body point right.
Candidate lapel/placket, collar and fabric folds differ from the accepted knit
cardigan. Head/body illustration details are not pixel-identical either. The
owner explicitly permitted those differences for this Staging trial; they remain
real-device judgment items, not a claim of final art approval.

Pack reference SHA `88a0f92b25c9b6739f311912d392b9db8a7327411f2a28d1f534890895b6b3e0`
also differs from the historical approved source SHA
`c9aa5e052b165961f1c54eb7352eb98f284cc70c7a01aae21a6559c1ac0dad1a`.
Therefore the actual trusted static runtime was compared too; exact original
pixel identity is not asserted from the reference filename.

Source alpha≥16 head tops are 47/48/48/47/48/48 and shoe bottoms all 864. No
alpha≥4 cell-edge contamination was found. Flattened/native previews show no
visible background panel, prop disappearance or cut shoes. The apparent color
speckles in direct transparent previews were checked against actual compositing;
nearly invisible export alpha is handled as in the accepted static pipeline.

## Reproducible derivative and unchanged still

From `frontend`:

```powershell
node scripts/prepareReflectorMotion.mjs
# Optional explicit extracted source directory:
node scripts/prepareReflectorMotion.mjs 'path/to/extracted/B2/source'
```

The script pins all six input hashes and sheet identity, verifies manifest images
and byte-identical grid cells, records original decoded-cell and optimized-cell
hashes, and rejects any visible artwork outside the common crop. Only alpha
1–3/255 export speckles are cleared, consistent with Part 4B. No new artwork,
pose repair, mirror, per-frame alignment, stretching or CSS motion is applied.

Common crop: `{left:0, top:42, width:320, height:828}` for every frame, containing
all source alpha≥4 pixels. The removed transparent margin lets the new shoe
baseline match the old still closely without deforming the figure. Uniform
`contain` scaling creates 264×492 transparent cells. Runtime atlas uses the
existing **3×2, 792×984** format; source remains the verified 6×1 sheet.

Runtime `eden-reflector-journal-motion-v1.webp`: **227,502 bytes**, quality 92,
alpha quality 100, effort 6, smart subsampling. SHA-256:
`13b69909347234b5c5c4bf3e2b6bf6ceb1a3ca53f4cdfa1bee394a16e00af849`.
Its calculated decoded RGBA size is 3,117,312 bytes, not measured GPU residency.
The `.json` sidecar records ZIP/hash, historical status/current authorization,
source frames/cells, crop/alpha/encoding, native direction and output hashes.

The **88×164 CSS** wrapper and original static file are unchanged. Static
`eden-reflector-journal-static.webp` remains 352×656 / 63,508 bytes, SHA
`c19601cedd49beabf63ea3017eecc050010e5c3e3ed98684eee3e156d83b7ca3`.
Its alpha shoe baseline is 162.75 CSS px; the common candidate export is about
162.8 CSS px. The six runtime shoe baselines vary by at most one runtime pixel;
blink head variation is at most one runtime pixel. Originals, ZIP, candidate
sheet, comparison and QA images are not committed as runtime resources.

## Motion and controller reuse

- Blink: `01(50) → 02(80) → 03(110) → 02(80) → 01(60)` ms, nominal **380ms**.
  Idle wait is **6.8 seconds**.
- Journal sequence: `01(180) → 04(500) → 05(600) → 06(300) → 01(220)` ms,
  nominal **1.8 seconds**, idle wait **26 seconds**.
- The existing B1 `pageTurn` secondary action also describes this compound
  think/write/page-turn/recover sequence. `journalWrite:true` is capability
  metadata. Only the type permits prototype `4G-B2`; the controller's actual
  scheduling code is unchanged. There is no second controller, financial naming
  workaround, save/input subscription or database event binding.
- Both actions serialize and return to 01. No blink interrupts writing, no idle
  polling/RAF is added, and each controller has only one pending timer.
- `04` is one independently drawn writing **pose**, not multiple separate pen
  stroke drawings. This six-key-pose prototype does not claim continuous multi-
  stroke handwriting. Such animation requires separately authorized new frames;
  no artificial arm shake/rotation or repeated still-frame trick is added.

Real Chromium wall-clock trace in this run measured approximately **432ms /
1,841ms**, including scheduling jitter, with the expected complete frame orders.
Screenshots captured writing and page turn at 390×844. These are synthetic browser
results, not actual iPhone Safari/PWA acceptance.

## Left corner, direction, fallback and safety

Only Review grants motion to the existing `eden-reflector` appearance. Its native
direction remains right. The facing wrapper is not mirrored for loaded static
Reflector, atlas loading, active frames, atlas failure or Reduced Motion. During
base-static loading/failure the existing original-Eden safety fallback still
mirrors inward as before; no incorrect left-facing fallback is introduced.

An atlas network/decode/display error exposes the unchanged approved static
Reflector. The existing errored-only `online` listener supports recovery without
polling. Loaded atlas state survives temporary pauses; stale decode completions
are ignored, listeners and timers clean up on unmount/route exit/Strict Mode.

Left-corner positioning, navigation clearance, safe areas and collision priorities
are unchanged. Save Reflection is hit-tested, never submitted; focused input
collision and keyboard-sized viewport take priority. Ordinary scroll keeps the
character fixed and does not change pose ownership. `aria-hidden`, `inert` and
`pointer-events:none` remain intact. Finance Locked alone does not stop motion.
PIN/dialogs, Genesis, fullscreen, Reduced Motion, background visibility,
pagehide/freeze and insufficient space retain their pause/hide protections.
Resume resets to 01 and fresh idle deadlines, without catch-up.

The requested acceptance URL `/review` was previously unknown and fell through
to Today. A minimal parser alias now resolves it to Review, including refresh,
legacy hash and history. Canonical navigation remains `/weekly-review`; no
redirect, forced runtime reload, delayed route correction or Review remount is
introduced. PWA/deep-link tests cover both paths.

About/wardrobe files, static Reflector selection, Smile/Think/Wave, Today/Capture,
Treasurer/Archivist metadata/timings/assets, Exercise parity, Cosmos selection,
Anime player, Review input/read/save and Auth/Guest logic are unchanged.

## Checks and known observations

- Full Vitest: **204 files / 1,622 tests passed**. New coverage includes source-
  cell/alpha/hash/anchor integrity, native facing through load/error, two sequences,
  serial timings, no idle commits, pause/reset, Strict Mode, stale decode/unmount,
  static wardrobe isolation, Finance Lock and four `/review` route variants.
- TypeScript, lint and production build passed; existing large-chunk advisories
  remain. Demo Firestore rules tests and five Functions packages passed. No live
  financial, exercise, review or Guest write, real account operation or paid API.
- B1 and Treasurer actual motion suites pass, including real frame order/timing,
  error/static fallback/reconnect, lifecycle and Reduced Motion. No B1 motion
  regression was found; its owner acceptance remains Pending.
- B2 browser passes left placement, no double mirror, frame orders and real timing,
  failure/retry, lifecycle, keyboard/landscape, Save hit test/focused input safety,
  `/review` history/reload and unchanged static wardrobe. About, Today/Capture,
  Exercise, Cosmos and wardrobe suites pass separately.
- **Known Capture observation reproduced once:** desktop 1440×1000, Anime synthetic
  player → play/fullscreen → exit/close → Today → Dashboard Capture. Dialog opened,
  but avatar stayed `idle`, `data-sheet` false, visible false, with no JS exception;
  wait for `perched` timed out. Evidence is in ignored
  `artifacts/avatar-part4g-b2-routes.log`, including the page/dialog/avatar snapshot.
  The unchanged suite rerun in `avatar-part4g-b2-routes-rerun.log` passed. This is
  the previously documented flow/signature, not an established new B1 motion
  failure. Its underlying cause remains unknown. No Capture code or test retry
  shortcut was introduced and no fix is claimed.
- Existing PWA glob already includes `assets/eden-reflector-*.webp`; no cache,
  launch, Auth or Service Worker configuration changes. Normal build has
  **53 entries / 4,846.83 KiB**, one extra atlas. Synthetic production-mode PWA
  fixture has 53 / 4,657.83 KiB due to repository stubs. Offline/update tests passed:
  all three atlases/shared renderer cached, no atlas decode on initial About,
  offline Review at both URLs with no mirror, explicit update and obsolete-JS
  replacement (53→53 entries, no automatic reload), and post-update offline blinks
  for Treasurer/B1/B2. All 13 static wardrobe looks, six Cosmos forms, four
  Exercise refresh entries, eight deep-link/reload routes and eight production-
  mode Today Capture cycles passed. This does not close the separate intermittent
  Capture observation above.

Changed files (under `frontend/` unless prefixed `docs/`):

- `src/components/avatar/reflectorMotion.ts`, `reflectorMotion.test.tsx`,
  `reflectorMotionAssets.test.ts`, `avatarMotion.ts` (types only),
  `avatarRegistry.ts`, `avatarRegistry.test.ts`, `EdenAvatar.tsx`,
  `AvatarMotionLayer.tsx` (comment only).
- `src/components/avatar/assets/eden-reflector-journal-motion-v1.webp` and `.json`.
- `scripts/prepareReflectorMotion.mjs`, `treasurerMotionBrowserValidation.mjs`,
  `avatarRouteBrowserValidation.mjs` (report label only), `aboutPwaValidation.mjs`,
  `aboutStagingValidation.mjs`.
- `src/routing/appRoutes.ts`, `appRoutes.test.ts` for the acceptance alias.
- `docs/eden-avatar-part4g-b2.md`.

Reproduce using existing guarded browser fixtures:

```powershell
node scripts/aboutBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/treasurerMotionBrowserValidation.mjs --records
node scripts/treasurerMotionBrowserValidation.mjs
node scripts/treasurerMotionBrowserValidation.mjs --review
node scripts/avatarBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/cosmosAvatarBrowserValidation.mjs
node scripts/aboutWardrobeBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# After matching staging Ready:
node scripts/aboutStagingValidation.mjs <full-sha>
```

## Owner device acceptance and stop

At https://staging--edenos.netlify.app/review, on iPhone Safari, installed PWA and
desktop, check:

1. Candidate cardigan/front/collar/folds and head/body style versus the accepted
   still; glasses/wing, right-hand pen/left-hand journal, cat and full shoes.
2. Blink naturalness, writing pose/real paper turn/recovery, stable head/feet and
   edges, no flash/cell bleed, correct low frequency and no overlap.
3. Left corner/native right direction through loading, Reduced Motion and failed
   resources; scroll/touch-through, Save access without submitting, keyboard,
   portrait/landscape/safe areas, Locked/PIN/dialogs/Genesis/fullscreen.
4. Background/restore, route leave/return/history, both Review paths and cold PWA
   start, explicit update, cached offline reload and reconnect.
5. B1 Records and Treasurer, Today Capture (especially the known Anime-close flow),
   Exercise parity, Cosmos six systems and static About wardrobe/gestures.

Pending: owner real-device visual acceptance, continuous multi-stroke writing art
and the pre-existing Capture investigation. This prototype does not certify iOS
BFCache/native keyboard/process behavior from Chromium checks. Keep B1/B2 Pending
until the owner explicitly accepts each. Stop after B2 technical staging delivery;
no B3/Watching/Swim/Boxing/Cosmos animation, Part 5/6/7 or Production follows.
