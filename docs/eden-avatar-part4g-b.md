# Eden Avatar Part 4G-B — Records / Archivist motion prototype

## Status and scope

**Owner accepted the current Archivist blink/page-turn implementation as-is for
the Little Eden Part 1–4 release scope on 23 November 2026.** Historical Pending
labels below describe technical delivery, not the current owner decision. This
does not complete deferred animation requirements or authorize Production merge:
the exact Release PR/SHA still requires final approval. No animation is removed
or retimed, and no further character or Part 5–8 work starts.

Fresh baseline: staging `7ff1eb4f3e40de053da6b4ae995a227ae41a5606`, CI
[44900532795](https://github.com/eden-low/EdenOS/actions/runs/44900532795) success,
Netlify `6b01841cd1ed5298eea89de0` Ready at that SHA. These are also the rollback
reference; no rollback is performed. Main stays
`f4b0b26b2398f040576fa01c81a9ef542407e389`. There were zero open PRs and no
conflicting active Codex task or modified tracked worktree. Historical QA files
in another worktree and the earlier release receipt remain untouched.

Development uses the existing isolated worktree on
`feature/avatar-part4g-b-archivist`; direct staging promotion without a PR is
explicitly authorized. The final delivery report supplies the new exact SHA,
CI and matching Ready deployment. No Firebase/Netlify sensitive configuration,
Firestore Rules, credentials, Production, account or real record mutation is
part of this work. Firebase deployed-environment parity is **not verified**.

## Six approved input drawings and verified mapping

All six actual PNG files were found in `C:/Users/Eden Low/Downloads/`, decoded
fully and visually reviewed. They are 962×1635 RGBA with effective transparency.
They have timestamp download names rather than the semantic names in the owner's
instruction. **Downloaded -3 is the page turn; downloaded -5 is the closed eye.**
Mapping follows the actual drawing and owner-specified pose, not the download
suffix. No PNG is renamed in Downloads or committed to the repository.

| Cell | Owner's semantic name | Actual downloaded basename | Pose | SHA-256 |
| --- | --- | --- | --- | --- |
| 01 | 伊登档案员全身立绘.png | ChatGPT 图像 2026年11月21日 21_01_55-1.png | idle-open | `4fb00c74ecbaf2afe1faabdd12434bf8ee1ce748b4571a25951d06377968827e` |
| 02 | 档案员伊登的温柔半眨眼.png | ChatGPT 图像 2026年11月21日 21_01_57-2.png | blink-half | `c2a3a00899bd22cb1c2b31125c771695ea028d7d18bb9432366ad1425eb8708a` |
| 03 | 闭眼微笑的档案员伊登.png | ChatGPT 图像 2026年11月21日 21_02_05-5.png | blink-closed | `4564c0c5c5dae81f3df31a07e7cc39b08e7f82bfc1c8d85b6340cbdc878e6104` |
| 04 | 专注阅读的档案员伊登.png | ChatGPT 图像 2026年11月21日 21_02_02-4.png | clipboard-read | `8c7f40d1ceb9d04af2f878a9f4a96a4738dd819b3abadfd55261548867558228` |
| 05 | 档案管理员伊甸翻页记录.png | ChatGPT 图像 2026年11月21日 21_02_00-3.png | page-turn | `b11fb11324b83482f9ba8372f286e42f2d9e68bf05da1cde4928a47509b79e5f` |
| 06 | 档案员伊登_翻页后温和回归.png | ChatGPT 图像 2026年11月21日 21_02_07-6.png | recover-open | `642df324a54cbf5abb9e043f64a526a48f55680770fbf9660a2298ea8f0ecfc6` |

The old approved 380×630 source remains available in Downloads/Eden, SHA
`ac632b474484cbdc7e2180530d5d7c681f109e7611fda83e122ceb999ccda47d`.
It and the trusted 264×492 static runtime were compared to the new idle at native
88×164. Identity, curls, black glasses, wing, clipboard/pen, pants, bag, cat charm
and complete shoes remain. The new supplied drawings have some illustration,
fabric-tone and fold differences; they are not claimed to be pixel-identical to
the older still. Device approval includes this initial-pose comparison.

The half/closed eyes are genuinely drawn independently. The page-turn source has
a different hand/pen position and raised, curved paper. Runtime-size comparison
and browser screenshots show the paper turn; no static-picture transform is used
to manufacture it. Review included transparency on light backgrounds, full poses,
common-sized previews, head/shoe locations and all accessories. No opaque panel,
obvious cut-off prop or visible-alpha source-edge contamination was found.

## Reproducible derivation and anchors

From `frontend`:

```powershell
node scripts/inspectArchivistMotion.mjs 'C:/Users/Eden Low/Downloads'
node scripts/prepareArchivistMotion.mjs 'C:/Users/Eden Low/Downloads'
```

The inspection/derivation pins each full source hash and its visual mapping.
Source diagnostics and comparison PNGs go to ignored browser-validation artifacts.
Only the runtime WebP, provenance JSON, scripts, tests and document are committed.

The input shoe baselines vary: 1626, 1627, 1627, 1599, 1632, 1628. Directly using
those unregistered canvases would visibly lift the reading frame's feet. The
generator therefore performs **integer source-pixel registration** to the first
frame's shoe horizontal center and shared shoe baseline y=1632:

| Cell | Source registration dx / dy |
| --- | --- |
| 01 | 0 / +6 |
| 02 | -6 / +5 |
| 03 | -5 / +5 |
| 04 | -10 / +33 |
| 05 | -2 / 0 |
| 06 | -13 / +4 |

This aligns already distinct drawings before export; it does not create the
eyelid, hand or paper changes. There is no CSS translation/rotation, nonuniform
scaling, mirroring, per-frame zoom, or newly generated artwork. All alpha≥4 pixels
must fit the common crop `{left:150, top:0, width:750, height:1644}`; otherwise
derivation fails. Only alpha 1–3 export speckles are cleared. All six then receive
the same uniform contain scaling and transparent cell framing.

Runtime: **`eden-archivist-clipboard-motion-v1.webp`**, 792×984, 3×2 row-major
cells of 264×492, **251,196 bytes**, WebP quality 92 / alpha quality 100 / effort 6.
SHA-256: `44ec07f5377cc7487e2fdc0706e35d0be03e569ff62b44821d0b9b5e625efb3f`.
`eden-archivist-clipboard-motion-v1.json` records input sizes/hashes, mappings,
registration, crop, decoded-cell hashes and runtime bounds. Reproduction must
produce the same runtime SHA. A single atlas avoids six competing frame loads or
frame-by-frame network/decode churn. Its calculated RGBA footprint is 3,117,312
bytes, not a measurement of GPU-resident memory.

The actual wrapper remains **88×164 CSS px**, right corner, with unchanged layout
and safe areas. Shoe baseline is runtime y=488 in every cell; shoe centers differ
by at most one runtime pixel. Blink head tops are y=6/5/6. Reading lowers the drawn
head to y=15, an intentional look-down pose; it is not an idle/scroll jump. The
static fallback still uses its original proportions and anchor unchanged.

## Sequences and scheduling

- Blink: `01(50) → 02(80) → 03(110) → 02(80) → 01(60)` ms; **380 ms**.
- Page turn: `01(180) → 04(400) → 05(600) → 06(300) → 01(220)` ms; **1,700 ms**.
- Initial and recovered state is frame 01. Blink waits 6.2 seconds; secondary
  action waits 22 seconds. Actions serialize. No blink is inserted during a
  page turn and missed deadlines do not queue background catch-up actions.
- Browser real wall-clock observation measured about **432 ms / 1,734 ms**,
  including scheduling jitter, and recorded both complete source-frame orders.
  No accelerated test-only production timings are added.

## Minimal controller extension and page isolation

`avatarMotion.ts` gains a typed secondary action, `abacus` or `pageTurn`, with a
discriminated 4G-A/4G-B definition. Only the previous abacus deadline/sequence
lookup becomes a selected secondary lookup. The same one-timer external store,
serialization, pause/reset and subscription cleanup remain. Treasurer adds an
explicit `secondaryAction:'abacus'`; its atlas, blink/abacus frame orders and all
durations/waits are unchanged and regressions cover them.

`archivistMotion.ts` owns the Records atlas and sequences. Registry adds optional
motion to Archivist while retaining its old static `asset`, identity, page mapping
and static capabilities. `EdenAvatar.tsx` grants motion to Expenses or Records
only. No routing, Cosmos selection, Exercise entry ownership, Finance data or
Capture state machine is changed. The existing Motion Layer renderer is reused;
only its comment expands to include Records.

About files, wardrobe switching/loading/focus, Hero and gesture machine are
unchanged. The gallery still reads the static asset and does not request the
motion layer. Other roles remain unchanged, including Review's native-facing
left-corner placement and Anime's prone pose/player occlusion.

## Fallback, Reduced Motion and lifecycle

- Atlas network/decode/display error exposes original
  `eden-archivist-clipboard-static.webp` (264×492, 48,890 bytes), unchanged SHA
  `75bef2ce7bfcd3e0175e7f7c5f367541084e45df391ac90ca0baefc9f88ebf83`.
  Failure of that base itself retains the pre-existing default-Eden fallback.
- Reduced Motion uses the approved still and does not request/decode the atlas
  on cold entry. Atlas failure never starts a polling retry loop; the existing
  errored-only online listener supports recovery and is removed on unmount.
- Existing visibility/`still` rules pause for PIN/modals/Genesis, fullscreen,
  keyboard and insufficient viewport. Finance Locked alone is not a pause signal.
  Document visibility, pagehide/pageshow and freeze/resume reset to idle; restore
  starts fresh deadlines and never replays missed work.
- Route unmount cancels the timer, image handlers/decode continuation and lifecycle
  listeners. Strict Mode and stale load checks remain. Ordinary scroll does not
  restart the sequence or change avatar placement. Decoration remains
  `aria-hidden`, `inert`, `pointer-events:none`.

## Verification

Changed files (paths below are under `frontend/` except the document):

- Runtime: `src/components/avatar/avatarMotion.ts`, `treasurerMotion.ts`,
  `archivistMotion.ts`, `avatarRegistry.ts`, `EdenAvatar.tsx`, and the descriptive
  comment in `AvatarMotionLayer.tsx`.
- Runtime art/provenance: `src/components/avatar/assets/eden-archivist-clipboard-motion-v1.webp`
  and the corresponding `.json`.
- Tests: `src/components/avatar/archivistMotion.test.tsx`,
  `archivistMotionAssets.test.ts`, `avatarRegistry.test.ts`.
- Scripts: `scripts/inspectArchivistMotion.mjs`, `prepareArchivistMotion.mjs`,
  `treasurerMotionBrowserValidation.mjs`, `avatarRouteBrowserValidation.mjs`,
  `aboutPwaValidation.mjs`, `aboutStagingValidation.mjs`.
- Handoff: `docs/eden-avatar-part4g-b.md`.

- Full Vitest: **202 files / 1,609 tests passed**. New tests cover cell/hash/alpha/
  anchor integrity, pose mapping (including downloaded -3/-5), both durations and
  orders, no blink during page turn, single timer, pause/no catch-up, no idle
  commits, Strict Mode cleanup, failure/retry and static wardrobe isolation.
- TypeScript, lint and production-mode build passed. The initial new inspection
  script unused-variable lint warning was removed; final lint is clean. Existing
  large-chunk build advisories and unrelated AnimeProgress test act advisories are
  kept separate from failures.
- Firestore demo emulator rules passed; all five existing Functions packaged.
  Tests use synthetic identities/repositories or the demo emulator and forbid
  real financial/exercise/review/Guest writes and paid API invocations.
- Records motion browser audit passes real timing/frame trace, 390×844 screenshots,
  fixed dimensions/scroll/touch flags, Locked, drawer/Genesis, synthetic pagehide/
  freeze and CDP freeze/resume, keyboard-sized viewport, landscape, atlas/display
  failure and online recovery, Reduced Motion and static wardrobe/re-entry.
- Treasurer's unchanged real-time motion audit, Today/Capture, eight-route long
  scroll/click-through/reload/history/safe-area/PIN/Account/Genesis/player/fullscreen
  checks and About gestures pass. Exercise deterministic entry/refresh/Strict Mode/
  two-tab parity, all Cosmos local systems/keyboard/internal navigation/stale loads,
  and all thirteen static wardrobe cards/gestures/focus/200% text also pass.
- PWA already includes `assets/eden-archivist-*.webp`; no cache configuration or
  update mechanism changes are needed. Production build now has **52 entries,
  4,624.16 KiB**, one additional atlas versus 4G-A. Precache does not mean eagerly
  decoding/playing motion in About or other pages.
- Production-mode PWA offline/update passes: both Treasurer and Archivist atlases
  and shared renderer are cached; neither atlas is decoded on initial About.
  Cold offline Records runs motion; post-update offline reload plays both roles'
  blinks. Explicit waiting-worker/apply-update replaces old revisioned JavaScript
  with **52→52** entries, without automatic reload or cache accumulation. All 13
  wardrobe outfits, six Cosmos forms, four Exercise refresh entries, seven offline
  deep-link/reload routes and eight Today Capture cycles pass. Its synthetic-provider
  build is 52 entries / 4,435.16 KiB; the normal app size above remains distinct.

Browser reproductions use the existing guarded Vite fixture on local port 5181:

```powershell
node scripts/aboutBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/treasurerMotionBrowserValidation.mjs --records
node scripts/treasurerMotionBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/cosmosAvatarBrowserValidation.mjs
node scripts/aboutWardrobeBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# After staging Ready at the matching SHA:
node scripts/aboutStagingValidation.mjs <full-staging-sha>
```

## Completed, pending and known observations

Implemented: six real drawing cells, Records-only blink/page turn, stable shoe
registration, shared finite-timer controller extension, static fallback, lifecycle
and safety reuse, new tests and reproducible provenance. New image generation,
other roles' animations, global wardrobe motion and data-driven reactions are
not implemented or authorized by this batch.

Owner iPhone Safari / installed PWA / desktop acceptance is **Pending**. Check:

1. Six supplied poses versus the old approved still: proportions, wing, pen,
   clipboard/paper, bag/cat and full shoes; clean alpha and no flash/cell bleed.
2. Natural blink, readable small page turn/recovery, no distracting body change,
   stable feet/idle head; low-frequency motion and correct return to frame 01.
3. Ordinary scroll/touch-through, actual PIN/entry dialogs/Genesis, keyboard,
   landscape and safe area, Finance Locked/Unlocked, OS Reduced Motion.
4. Background/restore, route leave/return, direct Records entry/refresh/history;
   PWA cold start, explicit update, cached offline entry and reconnect recovery.
5. Today +/Capture movement/perch/return, Treasurer, Exercise alternation, Cosmos
   six systems, Review, Anime player and static About wardrobe/three gestures.

Chromium synthetic checks are not actual iPhone Safari/PWA certification. The
earlier Anime Player close → Today Capture intermittent missing-anchor observation
remains under observation; passing current regression does not establish its root
cause or a fix. No Capture refactor is included. New source drawings have minor
illustration differences across poses, so naturalness still needs owner judgment.

Stop after this staging technical delivery. Do not automatically start the next
4G character or Part 5/6/7. Only recommend a next batch after this prototype is
accepted on the owner's real devices; Production remains separately authorized.
