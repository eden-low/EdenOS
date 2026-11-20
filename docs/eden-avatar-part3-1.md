# Eden Avatar Part 3.1 — acceptance fixes

Baseline: `5c8162c338562bb73a74b8adc04bb6137837ab27` / Ready staging deploy
`6b0047551201547c0de42096`. Staging promotion is authorized; Production is excluded.

## 1. Persistent idle avatar

The previous implementation measured every interactive control on every scroll
and passed those rectangles into the idle collision check. An ordinary button
passing through the fixed corner therefore made the companion disappear.

Idle and Capture now have separate obstacle inputs:

- Ordinary scrolling text, cards, charts, buttons and lists do not hide idle.
  `pointer-events: none`, `inert` and `aria-hidden` remain on the decorative portal.
- Idle protects controls inside fixed/sticky viewport furniture, the focused
  editable field, and explicitly marked important actions. Save reflection is
  marked `data-avatar-priority`; its handler, validation and persistence are unchanged.
- Focus/blur invalidate geometry even when there is no scroll event.
- Capture still checks every actual sheet control. Its close/top controls,
  headroom, anchor following, movement and perched pose retain their original rules.
- Modal/PIN, Account, Genesis, native/fullscreen media, unsafe viewport and reduced
  space rules remain. Finance Lock is not an avatar dependency.

## 2. Routing evidence and fix

Verified defects in the baseline (not an assumed cache failure):

1. `appPageFromLocation` preferred a recognized hash over a recognized pathname.
   `/expenses#/` resolved to Today; the same applied to all seven non-root routes.
2. App kept a separate `activePage` state initialized once and subscribed to only
   `popstate`/`hashchange` in a passive effect. A URL update between first render
   and subscription was missed. A restored document's `pageshow` did not resync
   content or navigation highlight. The exported push helper also did not notify
   mounted route consumers because native `pushState` emits no history event.

The focused pre-fix run had **10 failing / 25 passing route tests**. The same
route tests pass after the fix, including deterministic mount/subscription and
`pageshow` restoration cases. Clean known paths already survived basic remounts
in the baseline; this report does not claim every clean refresh was broken.

App now reads one URL-backed snapshot with `useSyncExternalStore`. Native history,
hash changes, `pageshow`, and the canonical push helper share the subscription.
Canonical non-root paths win over stale legacy fragments, while `/#/expenses`
compatibility remains. Search navigation uses the same push/notify helper.

No forced reload, delay, automatic redirect, cache reset, persisted last-page
override, Auth/Guest change, Genesis change, manifest change or Netlify redirect
change was introduced. Read-only staging requests to all seven deep links returned
200 with their original path, not a redirect to `/`. The existing PWA icon entry
is still `/`; an explicit root launch remains Today. A new document opened at a
retained deep link is tested separately from an explicit root launch.

The exact iPhone recording's URL/context at the reported jump was not available
to automation. The reproducible code defects above are confirmed; equivalence to
that original device event still requires owner retest. No claim of a real Safari
BFCache reproduction is made from the synthetic `pageshow` test.

## 3. Review orientation

Only Review's standing artwork gets a static horizontal mirror wrapper. Position,
88×164 size, sprite viewBox and blink timing are unchanged. Reduced Motion affects
the inner animation, so the static orientation survives it. Today and About assets
are unchanged. The inspected wing emblem is bilateral and contains no lettering;
the mirrored screenshot keeps a natural wing crest and needs no raster replacement.

## Verification

- Focused routing regression and real FirebaseAuthProvider with a synthetic auth
  service cover seven deep-link mounts/restored sessions without Guest/Google actions.
- Full Vitest: 184 files / 1,414 tests passed. TypeScript, lint, build, emulator
  rules and five Functions packaging passed; CI/deploy identifiers appear in the
  delivery report.
- Actual App/page browser fixture: all eight routes at 320/390/1440px; seven-page
  continuous scrolling; ordinary buttons hit-tested and clicked behind the inert
  avatar; fixed corners, Review mirror, focused fields and Save reflection; direct
  links, reloads, Drawer highlight, legacy fragments, `pageshow`, back/forward,
  Capture, Account, Genesis, local Cosmos and actual player/fullscreen with local video.
- Production-mode PWA fixture: real service worker/cache, offline new documents and
  reloads on all seven deep links with matching highlight, offline About Wave, and
  Records/Exercise Capture safety. Identities/repositories are synthetic and in-memory.
- Existing Today/Capture and About gesture browser suites remain in regression.
  Deployed SHA, eight routes, assets, manifest/worker and unauthenticated Functions
  protection are checked after staging Ready.

No original reference images, new outfit/actions, real user writes, paid API calls,
Firebase/Rules/Netlify sensitive changes or Production changes. Firebase parity is
not authoritatively verified. Parts 4–6 are excluded.

## Owner retest on staging

On iPhone Safari, installed PWA and desktop:

1. Repeat the original long scroll on all seven pages, including ordinary buttons
   behind the avatar; verify no idle disappearance, movement or accidental perch.
2. Check Review's inward orientation, blink/Reduced Motion, focused fields and
   Save reflection, plus fixed/bottom critical controls and keyboard/landscape.
3. For each deep link, refresh, directly reopen and go back/forward; compare URL,
   content and Drawer highlight. Repeat the exact recorded Safari/PWA event and
   record the URL if a jump persists. Distinguish retained-page reopen from the
   manifest's explicit root icon launch.
4. Check Today +/Dashboard perch and return, page-specific entries, PIN, Account,
   Genesis, full-screen media, offline PWA and About Smile/Think/Wave.

Visual testing does not require financial/reflection writes, Guest sign-out or AI calls.
