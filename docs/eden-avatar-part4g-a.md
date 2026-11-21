# Eden Avatar Part 4G-A — Treasurer motion candidate

## Delivery boundary

**Technical prototype verified locally. Owner animation acceptance: Pending.**

The owner accepted Part 4F in the current authorization. This phase adds only
Treasurer blink and a small look-down/abacus-touch sequence on Expenses. It does
not claim acceptance of the candidate art, complete the other eleven costumes'
animations, introduce financial reactions, animate the About wardrobe, or change
Today/Capture, About gestures, Exercise entry parity or Cosmos selection.

Fresh staging baseline and rollback reference:
`ca120f3d45609a2464e7cacf60bb9128b3c6ce67`, Ready deployment
`6b00ef1fc3752c8670790c00`; baseline CI
[44848367720](https://github.com/eden-low/EdenOS/actions/runs/44848367720).
Production main remains `f4b0b26b2398f040576fa01c81a9ef542407e389`.
Development is isolated on `feature/avatar-part4g-a-treasurer`. Fresh fetch and
open-PR/task/worktree checks found no conflicting release. Historical QA files
in a different anime worktree and the root diagnostics branch were left intact.
The exact promoted SHA, matching CI and Ready deployment are in the delivery
report; no Production release or rollback is authorized here.

## Source gate and visual limitations

The owner ZIP `Part4G_A_Treasurer_Motion_Asset_Pack.zip` is 5,248,311 bytes,
SHA-256 `6455958377e9e7cae0ba50a87dabe1991e14a18cd6e50d9a763692667f1c6192`.
ZIP entries were checked for traversal before extraction into ignored local QA
artifacts. All ten files decode/read successfully. The 1536×1024 RGBA sheet is
three columns by two rows, each 512×512. Independent frame PNGs are byte-identical
in decoded RGBA pixels to their corresponding sheet cells, in row-major order.

The sheet SHA-256 is
`2685cfca4fa03f5ff2dc4820281f88d888ef6fe3d7ec97a292154dc7793f1041`.
Full input PNG, original-cell and optimized-cell hashes are checked/recorded by
`inspectTreasurerMotion.mjs`, `prepareTreasurerMotion.mjs`, and
`eden-treasurer-abacus-motion-v1.json`. Originals, review composites and the ZIP
remain outside committed runtime assets.

Visual inspection covered the sheet, standalone frames, light-background alpha
edges, face/hand/abacus comparisons, old static/reference/new idle side by side,
and native 88×164 previews. Curls, black glasses, white-blue wing, vest, cargos,
abacus, bag, white cat charm and shoes retain the Treasurer identity. No visible
cell-edge contamination, background panel, missing limb or strong outline fringe
was found. Source head tops vary by one pixel (7–8), feet by one pixel (497–498).
Runtime alpha/anchor tests check all six independently.

The pack's `treasurer-original-approved-reference.png` hashes to
`dc7b4e1b63f8e5a7dfe3240ad09325b4e78f5f5e0c0c7227cc97328a795288df`,
which differs from the historical 4A source hash. Exact reference pixel identity
was **not** established. Comparison against the actual trusted static WebP was
therefore performed too. New idle has small illustration/fold/render differences;
it is not claimed to be a pixel clone. No conspicuous identity/proportion change
was found at runtime size, but the owner must confirm this on device.

Blink closure, lowered gaze and fingertip touch are visible at 88×164.
**Fine individual bead movement is subtle** and remains an explicit owner visual
acceptance point. This is a small candidate idle gesture, not a claim of a large,
clearly resolved independent bead slide. If it is insufficient on iPhone, keep
the approved static fallback and obtain improved dedicated art; do not fake it
with CSS rotation, distortion, displacement or additional generated frames.

## Reproducible runtime derivation

From `frontend`, with the verified source files in the ignored default location:

```powershell
node scripts/inspectTreasurerMotion.mjs
node scripts/prepareTreasurerMotion.mjs
```

Both accept a source-directory argument. Derivation pins input hashes and rejects
any independent frame that differs from its source cell. One identical crop
`{left:158, top:0, width:252, height:506}` is applied to all six cells, preserving
the old still's body/foot placement with intentional transparent room on the
right. It retains every alpha≥4 pixel. Alpha 1–3 export speckles alone are cleared.
Uniform `contain` scaling produces 264×492 cells; no per-frame alignment,
stretching, redrawing or pose correction occurs. Three-times CSS resolution fits
the candidate's original 512-pixel cell without artificial enlargement.

| Runtime resource | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `eden-treasurer-abacus-motion-v1.webp` | 792×984, 3×2 cells | 255,214 | `5be75a2bb61cad18a766d60e985bc7dfd0ea8dcc6969eaa600b6d44d5fe6bf4f` |
| unchanged `eden-treasurer-abacus-static.webp` | 352×656 | 62,760 | `681f00353d7c9df19dd8f18d60964985e4d5a51b6df42e22eab0c1518b38abb3` |

The atlas uses WebP quality 92, alpha quality 100, effort 6, smart subsampling.
Its uncompressed RGBA size is 3,117,312 bytes (a size calculation, not measured
resident/GPU memory). The wrapper stays 88×164 CSS pixels and keeps existing
right-corner, safe-area, pointer-events:none, inert and aria-hidden behavior.

## Frame mapping and cadence

| Frame | Source | Purpose |
| --- | --- | --- |
| 01 | `01_idle-open.png` | Initial/recovered open eyes |
| 02 | `02_blink-half.png` | Half closed eyes |
| 03 | `03_blink-closed.png` | Closed eyes |
| 04 | `04_look-down.png` | Look toward abacus |
| 05 | `05_abacus-touch.png` | Fingertip/abacus gesture |
| 06 | `06_recover-open.png` | Recover open pose |

Blink: `01(50) → 02(80) → 03(110) → 02(80) → 01(60)`, milliseconds,
nominal 380 ms, with 6.2 seconds idle waiting after blink. Abacus:
`01(180) → 04(400) → 05(500) → 06(300) → 01(220)`, nominal 1.6 seconds,
with a 22-second deadline. Actions serialize; missed competing deadlines restart
instead of overlapping or catching up. Real Chromium wall-clock observation in
this run measured approximately **433 ms / 1,644 ms**, including scheduling
jitter. It captured all expected source frames and the closed/touch screenshots
at a 390×844 viewport. This is not real iPhone Safari testing.

## Ownership, fallback and lifecycle

- Registry keeps the accepted static `asset` and adds optional `motion` metadata.
  `treasurerMotion.ts` owns atlas geometry, capability and frame timings. Only
  Expenses grants `motionEnabled`; all other costumes keep their existing paths.
- `avatarMotion.ts` is a separate external-store controller with one pending
  deadline timer. Idle does not poll or rerender. There is no financial data,
  amount, success event, randomness, perpetual RAF or per-frame time loop.
- Lazy `AvatarMotionLayer.tsx` preloads/decodes the one atlas and renders real
  source cells via SVG viewBox. It never transforms body parts. The old image
  stays available underneath and is hidden only while the motion layer is active.
- Atlas network/decode/display failure exposes that original Treasurer still,
  not a broken image or an unrelated costume. Retry is bounded to a subsequent
  `online` event while errored; no polling. Existing failure of the static base
  itself still uses the previously established original-Eden safety fallback.
- Existing `still`/visibility rules stop motion for Reduced Motion, occlusion,
  PIN/dialog/Genesis, fullscreen, keyboard/insufficient space. Finance Locked
  alone is not a stop signal. Document visibility, pagehide/pageshow and
  freeze/resume also cancel/resume from a fresh idle wait. No elapsed actions
  are replayed. Loaded atlas state survives temporary safety pauses.
- Unmount cancels the single timer, image handlers/decode continuation and
  reconnect/lifecycle listeners. Strict Mode and late decode tests cover cleanup.
  Leaving Expenses resets ownership; re-entry starts at frame 01 and waits.
- About's components, gesture machine, wardrobe order/selection/focus and loading
  code are unchanged. The optional motion field does not alter static `asset`.

## Verification and performance evidence

- Full Vitest: **200 files / 1,602 tests passed**. New controller, renderer and
  asset tests cover source mapping/hashes, alpha/anchors, both sequences,
  serialization, one timer, no idle commits, Strict Mode, stale decode cleanup,
  pause/restore, Reduced Motion, Finance Lock, failure and reconnect cleanup.
- TypeScript `tsc -b`, lint and production-mode build passed. The existing large
  chunk advisory remains; no unrelated bundle/state/navigation refactor occurred.
- Firestore ownership/catalogue/progress/finance/goals/budgets/allocations/review/
  settings/body-measurement rules passed in the **demo** emulator. All five
  existing Functions packaged successfully. No real record or account mutation.
- Actual-component Chromium: Treasurer real timings, idle scroll/88×164 anchors,
  click-through/inert flags, Locked, real drawer/Genesis, synthetic page lifecycle,
  CDP freeze, keyboard-sized viewport, landscape, network/display failures,
  recovery, Reduced Motion cold entry, unmount/re-entry and static wardrobe pass.
  The active Expenses document decoded the atlas once across normal actions.
- Existing browser suites passed: Today/Capture; eight-route mapping/scroll,
  reload/history, PIN/Account/Genesis, Anime synthetic player/fullscreen and
  Weekly Review; Exercise deterministic entries; Cosmos six local systems,
  keyboard/internal navigation, stale loads/recovery; About gestures; wardrobe
  all 13, keyboard, widths/200% text, themes and modal guards.
- The first Cosmos run had one `bazi error` failure-injection wait timeout while
  four suites ran concurrently. A separate unchanged-suite rerun passed every
  case. The timeout was not attributed to a proven application defect or hidden
  by a runtime change. Both local logs are retained.
- Production PWA build: **51 precache entries, 4,378.22 KiB** (previous 49;
  atlas and lazy renderer add two). Existing image glob/JS rules already cover
  both; no Service Worker/PWA config changes. A synthetic signed-in PWA fixture
  has the same 51 entries, 4,189.22 KiB due to mocked repositories.
- PWA offline and real waiting-worker/apply-update checks passed: 51→51 entries,
  obsolete revisioned JS removed, no automatic reload, seven cold deep-link/
  refresh routes, Treasurer atlas/controller and post-update offline blink,
  all 13 static wardrobe appearances, Cosmos six forms and four Exercise forms.
  Precache did not decode the atlas on About or all six Cosmos forms together.
  Eight production-mode Today Capture open/close/route-return cycles passed.

Reproduction scripts under `frontend/scripts`: `treasurerMotionBrowserValidation`,
`avatarBrowserValidation`, `avatarRouteBrowserValidation`,
`exerciseAvatarBrowserValidation`, `cosmosAvatarBrowserValidation`,
`aboutBrowserValidation`, `aboutWardrobeBrowserValidation`, `aboutPwaValidation`
(all `.mjs`). Shared synthetic providers prohibit writes, block Firebase/Google
and paid Functions, and use fresh diagnostic Chrome profiles. Follow their
fixture prerequisites; outputs stay in ignored `artifacts/browser-validation`.

The known Anime Player close → Today Capture missing-anchor observation remains
**unresolved/under observation**. This run's routes, player and Capture checks
passed; no root-cause fix is claimed and no Capture-state rewrite was made.
Firebase deployed-environment parity is **not verified**. Real sign-in and owner
financial/exercise/review data were not exercised. No Firebase/Netlify sensitive
configuration, Rules, Production code/branch or user data was changed.

## Owner device acceptance — Pending

At https://staging--edenos.netlify.app/expenses, on iPhone Safari, installed PWA
and desktop, check:

1. Initial pose versus the previously accepted still; unchanged identity/wing,
   glasses, abacus, cat and shoes, stable head/feet and transparent outline.
2. Wait through natural blink and the less frequent small abacus gesture; judge
   gaze/fingertip/bead clarity and whether illustration transitions feel natural.
3. Scroll/touch-through, Finance Locked/Unlocked, actual PIN/add dialogs, keyboard,
   portrait/landscape/safe areas; background/restore and route leave/re-entry.
4. OS Reduced Motion is the original still; offline cached entry, explicit PWA
   update and reconnect recovery. Do not abandon a valuable Guest identity.
5. Today blink/+Capture movement/perch/return; Anime Player close → Today Capture;
   Exercise alternation, Cosmos synchronization, static wardrobe and gestures.

Chromium checks do not certify iOS Safari rendering, BFCache, native keyboard or
installed PWA process behavior. Owner confirmation alone can mark 4G-A Accepted.

## 4G-B handoff only

Future approved motion can provide its own capability/atlas/sequence metadata to
the isolated motion controller and renderer. Maintain static fallback, source
registration and visual gates. Broaden the narrow action/prototype type only
when the next batch is separately authorized; do not automatically enable motion
in the wardrobe or attach business events. Other eleven costumes' dedicated
blink/prop/idle frames remain unimplemented. Stop after this staging delivery;
no 4G-B/C/D, Part 5/6/7 or Production work follows automatically.
