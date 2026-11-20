# Eden Avatar Part 4 — confirmed plan v1.0 and current handoff

This records the owner's 21 November 2026 confirmation in the EdenOS Project.
The current Part 4A instructions and the three approved PNGs are the implementation
authority for 4A; no separate repository copy of the earlier Project plan was supplied.
The owner subsequently accepted 4A and approved Records / Archivist for 4B batch 1,
then Weekly Review / Reflector for batch 2 and Anime / Watching for batch 3.
See the [Archivist handoff](eden-avatar-part4b-archivist.md),
[Reflector handoff](eden-avatar-part4b-reflector.md) and
[current Watching handoff](eden-avatar-part4b-watching.md) for assets,
validation and acceptance checklists; Treasurer provenance below is retained.
Part 4C subsequently authorizes the approved standalone Swim/Boxing sources and
deterministic Exercise entry alternation; see [the current 4C handoff](eden-avatar-part4c-exercise.md).
Part 4D now authorizes six visually verified final sources and shared Cosmos
selection; see [the 4D static handoff](eden-avatar-part4d-cosmos.md).

## Stage boundaries

| Stage | Confirmed scope | Implemented here |
| --- | --- | --- |
| 4A | Shared specification for 13 identities, selector architecture, approved abacus Treasurer static prototype | Yes |
| 4B | Expenses, Records, Weekly Review and Anime outfits with basic idle | Batches 1–3: Records, Review and Anime static prototypes; all new motion pending |
| 4C | Exercise Swim / Boxing dual form with deterministic alternation | Static outfits and per-tab entry parity; dedicated animation frames pending |
| 4D | Six Cosmos forms mapped directly to its internal systems | Six static outfits and shared selection; dedicated action frames pending |
| 4E | Overall performance, PWA, accessibility and real-device acceptance optimization | No; current batches only perform their required regression checks |

Part 4A was accepted by the owner. Part 4B batches 1–3 authorize Records, Review and Anime only.
Part 4C static forms and parity are now authorized. Part 5 financial reactions are
separate. Do not start further animation batches, 4E or
Part 5 automatically; await the owner's Cosmos six-form real-device acceptance.

## Shared character and material specification

- One Eden identity: preserve the approved curly hair, face/glasses, anime/chibi
  proportions and white/blue EdenOS wing insignia. Never restore the old triangle.
  Role variation comes from approved clothing/props, not an invented new identity.
- Do not fabricate approved outfit details for the planned roles. New visual
  directions, sports accessories, poses and animations require their own approval.
- Preserve head/body/feet stability across future frames. Do not approximate hand,
  elbow, blink or abacus motion by rotating/stretching a still image or repeating it.
- Static runtime art uses a transparent high-resolution derivative, rendered in
  the common 88×164 CSS frame with uniform scaling and the frame's bottom-center
  foot anchor. Document intrinsic dimensions, alpha, provenance and frame offsets.
- Keep visual assets and capabilities separate from page selection, motion state,
  viewport placement and safety. Planned entries have no asset URL and resolve to
  the accepted original, rather than displaying fake completed outfits.
- Original Today art, blink and Capture poses are retained unchanged. About keeps
  its independent Smile/Think/Wave v2 implementation and no global companion.

## Registry and current page selection

| ID | Intended module/stage | Current status |
| --- | --- | --- |
| `eden-default` | Today; safe fallback everywhere | Original approved sprite/blink/perch |
| `eden-treasurer` | Expenses, 4A/4B | Approved **static 4A prototype**, no blink or abacus idle |
| `eden-swim` | Exercise, 4C | Approved static Swim, no dedicated idle frames |
| `eden-boxing` | Exercise, 4C | Approved static Boxing, no dedicated idle frames |
| `eden-archivist` | Records, 4B batch 1 | Approved **static 4B prototype**, no blink, reading, page turn or nod |
| `eden-reflector` | Weekly Review, 4B batch 2 | Approved **static 4B prototype**, native right-facing; no blink, page turn, writing or look-up |
| `eden-watching` | Anime, 4B batch 3 | Static prone cutout derived from the approved board; no blink, gaze or yawn |
| `eden-tarot` | Cosmos Tarot, 4D | Approved static star-cloak/card |
| `eden-iching` | Cosmos I Ching, 4D | Approved static green robe/three coins |
| `eden-bazi` | Cosmos BaZi, 4D | Approved static scholar/calendar scroll |
| `eden-astrology` | Cosmos Astrology, 4D | Approved static astronomical coat/star chart |
| `eden-ziwei` | Cosmos Zi Wei, 4D | Approved static ornate star officer/chart/ribbons |
| `eden-ai-explorer` | Cosmos Ask Cosmos, 4D | Approved static technical coat/hologram |

There are exactly 13 requested IDs, now all with available artwork (one accepted
original sprite and twelve static prototypes). Part 4D adds only the six Cosmos
resources. No user-facing clothes picker is added: the selector
is deterministic page intent. Today always selects `eden-default`; Expenses selects
Treasurer; Records selects Archivist; Review selects Reflector;
Anime selects Watching; Exercise alternates Swim/Boxing on committed page entries;
Cosmos uses its actual selected system via one shared typed store; About selects none.
Account remains an existing modal that hides the global avatar.

## Approved files and deterministic derivation

| Input | Dimensions | Alpha / use |
| --- | --- | --- |
| `treasurer-eden-abacus-source.png` | 992×1586; 1,295,438 bytes | RGBA, full decode verified; **only** high-resolution derivation input |
| `treasurer-eden-abacus-88x164.png` | 88×164; 22,716 bytes | RGBA; proportion/legibility reference only, never enlarged into production art |
| `treasurer-eden-abacus-review.png` | 1240×650; 118,798 bytes | RGB without alpha; technical review only, never used as a sprite |

Approved source SHA-256:
`beeeac4d3a2b8a96119f6d8a84e83492f105fef7db01e1d26bda7b0e8450cf42`.
Reference originals remain outside Git. Only the derived WebP and provenance JSON
are committed under `frontend/src/components/avatar/assets/`.

- Runtime: `eden-treasurer-abacus-static.webp`, **352×656 RGBA, 62,760 bytes**.
- CSS: **88×164**; 4× resolution; `object-fit: contain`; bottom-center anchor.
- Crop excludes 120px of transparent left margin, then uniformly fits the source
  into the transparent frame. All pixels with alpha ≥4 lie at source x=203..796,
  so the crop retains curls, glasses, wing, abacus, gray cargo pants, backpack, cat
  and complete shoes. Internal margins follow the supplied small-size reference.
- WebP quality 92, alpha quality 100, effort 6; no redraw, pose edit, compositing
  from the review board, paid generation, CSS stretching or synthetic motion.
- Sidecar JSON records source hash, crop, frame, encoding, runtime hash and size.
  CI verifies decode, alpha, dimensions, hash, footprint and foot/head bounds.

Rebuild from the **same approved source**, from `frontend/`:

```powershell
node scripts/prepareTreasurerAvatar.mjs 'path/to/treasurer-eden-abacus-source.png'
```

The generator rejects an unapproved source hash. It never reads either reference
preview. Source PNGs and all visual QA artifacts must stay outside public commits.

## Runtime responsibility boundaries

| Responsibility | Owner |
| --- | --- |
| Role IDs, readiness, capabilities, visual dimensions/anchor/URL | `avatarRegistry.ts` |
| Page → ID selection; no records, amounts, randomness or save events | `avatarPageSelection.ts` |
| Per-document committed Exercise entries and session parity | `exerciseAvatarEntry.ts` and `useExerciseAvatarEntry.ts` |
| One canonical Cosmos experience, shared with the page | `cosmosSelection.ts` and `CosmosSelectionProvider.tsx` |
| Original sprite vs static image; preload/decode/error, actual-material facing and unload cleanup | `AvatarAppearance.tsx` |
| Original blink/perch pixels | Existing `AvatarSprite.tsx` and original atlas, unchanged |
| Today action sequence/timers | Existing `avatarMachine.ts`, unchanged |
| Fixed corners, safe areas, idle/Capture obstacles and occlusion | Existing layout/obstacle/provider logic, unchanged apart from selecting a renderer |

During Treasurer loading, network/decode failure or a displayed-image error, show
the genuine original sprite as a safe fallback. The effective/requested ID and
asset status are observable in DOM metadata, not a product error banner. Unmount
clears preload handlers and ignores stale decode completion; re-entry retries.
The static prototype has no blink nodes, abacus timers or financial event binding.
Reduced Motion does not animate or recreate the static image.

## Preserved behavior

- Today remains original, including +/Dashboard Capture movement, perch and return.
- Expenses keeps its right corner, nonintercepting/inert decoration and ordinary
  scrolling behavior. Finance Locked/Unlocked does not select, reload or hide art.
- Existing modals/PIN, Account, Genesis, fullscreen, focused controls, keyboard,
  landscape and insufficient viewport space keep their safety behavior.
- Records uses the approved static Archivist. Review uses the native right-facing
  static Reflector in its unchanged lower-left frame, without extra mirroring.
  During load/failure, the original default is mirrored inward in that frame.
- Anime uses the static Watching prone artwork, bottom-fitted at its native ratio
  in the existing right corner. Posture metadata is independent of Capture state.
  The player/fullscreen/modal and focus safety rules remain unchanged.
- Exercise adds two static outfits with one tab-local parity advance per committed
  entry. Scroll, rerenders, overlays, lock state and duplicate restore events do
  not select another form. Resource failures retain the consumed entry.
- Cosmos maps all six actual system selections directly to its six approved
  static forms. Results, inputs, scrolling and rerenders do not change clothes.
  A fresh visit resets both actual UI and avatar to Tarot. Online resource retry
  keeps the same selected system and calculation state.
- PWA adds only the twelve available static outfit filename patterns to the existing precache;
  update prompting, manifest/start URL, routing and offline security are unchanged.
- No financial records are read by wardrobe modules; no real writes, Guest exit,
  paid APIs, Firebase/Rules, Netlify sensitive settings or Production changes.

## Future interfaces — handoff only, not implemented

- **4B:** obtain approved dedicated atlas frames for Treasurer blink/abacus idle
  and the Records/Review/Anime costumes. Extend visual metadata with frame/pose
  definitions and add a renderer/controller for those real frames. Keep the
  original Today sprite path intact and retain resource-failure fallback.
- **4C animations:** entry parity is implemented independently of renderer and
  data. Dedicated goggles/shoulder/punch/glove/blink frames are still absent;
  never fake them by transforming the static art or triggering on workout saves.
- **4D animations:** shared selection and all six static forms are implemented.
  Card/coin/scroll/star-chart/hologram actions and new blink frames still require
  dedicated approved art. No autonomous rotation or AI invocation belongs in the renderer.
- **4E:** measure all-role decoded memory, preload/cache budgets, route transitions,
  Reduced Motion, accessibility, keyboard/safe-area behavior and actual Safari/PWA.
  Current single-resource tests are not a claim that the whole 4E phase is complete.
- **Part 5:** only a successful authoritative income/expense save may later emit a
  small semantic outcome to an animation controller. Draft edits, attempted saves,
  failed requests and amount visibility must not trigger it. The domain/page owns
  success; the renderer owns motion playback. No event bus or listener is installed.

## Part 4A verification and historical release reference

Local checks: full Vitest **187 files / 1,430 tests**, TypeScript, lint, build;
actual-component browser regressions with synthetic providers; image failure and
retry, route/unmount cleanup, all corners/scroll/click-through, lock invariance,
Reduced Motion, original Today/Capture and About, and production-mode PWA offline.
Rules emulator and Functions packaging supplement these checks. Exact CI/deploy
results are reported on delivery; real Firebase parity is **not verified**.

Rollback reference: SHA `905b9f4b30300e66ba50dc0fb99ea49cfa43adbf`, Ready deploy
`6b0060d2c816d49907a71b44`. No rollback is performed automatically.

At https://staging--edenos.netlify.app/expenses, the owner still needs to accept
the **static 4A** silhouette, glasses/wing, readable abacus, gray pants, cat, head
and shoe placement at 88×164 on iPhone Safari, installed PWA and desktop. Also
recheck scroll/touch-through, Locked/Unlocked and actual PIN, entry dialogs,
keyboard/landscape/safe areas, offline refresh and route leave/return. Recheck
Today perch/return, Review orientation and About's three gestures. Visual QA does
not require real financial/reflection writes, Guest sign-out or paid APIs.

Stop after staging technical delivery and await that visual acceptance.
