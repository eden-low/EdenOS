# Part 4B batch 2 — Weekly Review / Reflector Eden

## Scope

Only `review` changes to `eden-reflector`. Today/default blink/Capture, Treasurer,
Archivist and About Smile/Think/Wave v2 are preserved. Anime, Exercise and Cosmos
remain default. There are four available appearances and nine planned IDs with
no resource URLs. This is a **static prototype**: no blink, page turn, writing,
look-up, click action or simulated motion is added.

## Approved final image and resource

The only source is the owner's final `思考中的少年与飞翼书册.png`,
**817×1925 RGBA PNG, 1,784,263 bytes**, fully decoded and checked on light/dark
backgrounds. The final pose has the right hand holding a pen by the mouth and
the left hand supporting an open journal; face/body point right. No image mirror,
pose generation, compositing from previous drafts or paid API is used.

Source SHA-256:
`c9aa5e052b165961f1c54eb7352eb98f284cc70c7a01aae21a6559c1ac0dad1a`.

`eden-reflector-journal-static.webp`: **352×656, 63,508 bytes**, transparent,
uniform 4× **88×164 CSS px** frame, `object-fit:contain`, bottom-center anchor.
SHA-256: `c19601cedd49beabf63ea3017eecc050010e5c3e3ed98684eee3e156d83b7ca3`.

The entire original canvas is preserved, leaving side/top/foot clearance. No hair,
hand, pen, journal, wing, backpack/cat or shoes are cropped. Only alpha values
1–3/255 are cleared (70,905 nearly invisible export speckles); all stronger source
alpha values and RGB artwork are retained before downsampling. Light/dark preview
checks show no obvious residual fringe. The source PNG remains outside Git.
The sidecar JSON records dimensions, hashes, encoding, cleanup and capabilities.

```powershell
# From frontend; rejects any unapproved source hash.
node scripts/prepareReflectorAvatar.mjs 'path/to/思考中的少年与飞翼书册.png'
```

## Orientation follows the displayed resource

`EdenAvatar` still owns the fixed left/right corner, placement, safety and Today
Capture state. It passes a Review-only inward-facing intent to `AvatarAppearance`.
The facing wrapper now lives beside the actual appearance state, using registry
`nativeFacing` metadata. Ready Reflector is already right-facing and receives no
transform. Loading, network/decode failure or displayed-image error renders the
original default and mirrors that left-facing sprite inward. This decision changes
with the actual rendered material, without callback races or layout state changes.
Other pages pass no inward intent and retain their accepted native directions.
The original atlas and shared facing CSS are unchanged, including Reduced Motion.

The existing loader cancels handlers/ignores stale decode completion on unmount,
and retries on re-entry. No finance or Review data is read by wardrobe selection.
No Review input, validation, saving, auth, PIN or financial privacy logic changes.
The portal retains `aria-hidden`, `inert` and `pointer-events:none`.

## Verification and release

Tests cover role mapping/static capabilities, resource alpha/hash/proportions and
head/foot bounds, actual-material facing during ready/loading/error, Reduced Motion,
stale load cleanup and all previous appearances. Browser tests use actual pages
with in-memory identities and explicit synthetic repositories, external financial
services blocked. Save Reflection is hit-tested only; no record is saved.

Local checks passed: **189 Vitest files / 1,449 tests**, TypeScript, lint,
production build with **40 precache entries**, demo Firestore emulator rules and
all five Functions packages. Existing large-chunk build advisories remain.
With Vite on 5181, run:

```powershell
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# After the exact staging SHA is Ready:
node scripts/aboutStagingValidation.mjs <full-staging-sha>
```

These exercise 320/390/1440 widths, all routes and reload/history, ordinary long
scroll/click-through, left corner and Save Reflection/focus safety, lock invariance,
modal/Genesis/fullscreen, keyboard-sized viewport/landscape, Today Capture and
About gestures. Each static outfit has failed-network/default fallback and fresh
re-entry checks; Review asserts mirrored default vs unmirrored ready Reflector.
Production-mode PWA verifies cold offline Review reload, decoded Reflector and no
mirror, alongside Treasurer/Archivist/About. Release smoke compares deployed hashes,
routes, manifest, service worker and authentication boundaries. Exact results and
CI/deploy identifiers are in the delivery report; automation is not iPhone approval.

All local browser/PWA checks above passed, including three screen widths and
both ready/fallback Review directions, with zero runtime exceptions in the
completed runs. One initial diagnostic session hit a target-navigation startup
error; its isolated rerun completed successfully without an application change.

Rollback reference: `98c4d2745fadda68a242e7bc2b147890e9df59c7`, Ready deployment
`6b00a51fc36cc507a300c653`. No rollback is performed automatically.
Firebase parity is **not verified**. No Production, Firebase/Netlify sensitive
configuration, Rules, real user writes, dangerous Guest actions or paid APIs change.

## Owner acceptance and stop boundary

At `/weekly-review` on iPhone Safari, installed PWA and desktop, inspect the full
88×164 silhouette, right-facing expression, right-hand pen/left-hand journal,
glasses/wing/cat, clean edges and stable head/feet. Test scrolling/touch-through,
Save Reflection reachability without submitting, input focus/keyboard, safe areas,
landscape, lock/PIN/modal, offline reload, deep links/history and page leave/return.
Recheck Today Capture, Expenses Treasurer, Records Archivist and About gestures.

Stop after this staging batch and wait for owner acceptance. Anime, new idle frames,
Exercise dual forms, Cosmos six forms, Part 4E and Part 5 are not started.
