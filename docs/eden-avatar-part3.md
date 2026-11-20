# Eden Avatar Part 3 — persistent companion and Capture scope

## Approved page policy

| Page | Standing position | Capture behavior |
| --- | --- | --- |
| Today | Lower right | Mobile + and Dashboard Capture retain the accepted journey/perch |
| Expenses | Lower right | Existing Add Expense / Add Income dialogs hide the companion |
| Exercise | Lower right | Existing Capture workout hides the companion |
| Records | Lower right | Existing Capture entries hide the companion |
| Weekly Review | Lower left | Inputs and Save reflection retain priority |
| Anime | Lower right | Player/modal/fullscreen hides the companion |
| Cosmos | Lower right | Local controls retain priority; no new AI behavior |
| About Eden | No global companion | Existing dedicated interactions are unchanged |
| Account | No visible global companion | Account is an existing modal, not a new route |

The mobile bottom-center + only exists on Today. Other routes do not render its
wrapper, trigger, CaptureSheet instance or touch target. Existing page-specific
entry components and data handlers are unchanged.

## Position and lifecycle

- The accepted sprite stays fixed to the visual viewport and safe-area bounds.
  Review uses lower-left; desktop leaves an additional 100px beyond the normal
  12px inset for the existing sidebar. Other approved pages use lower-right.
  Only Today reserves the mobile + gap; other pages rest 20px above the safe-area
  bottom, avoiding unnecessary collisions with short-page empty-state actions.
- Plain text, noninteractive cards/charts, status and alert text are not collision
  obstacles, including read-only focusable chart images. Actual buttons, links,
  fields, interactive ARIA roles, editable elements and native media
  controls are measured. Collisions hide at the existing anchor; scrolling never
  substitutes the Capture bust or searches for a moving position.
- Capture anchors are scoped to the publishing page and owner. Only Today can
  supply an anchor to the perch state machine. Other sheets are ordinary modal
  occluders, leaving the underlying avatar in standing idle.
- Route Suspense and navigation instances are keyed by page: old Capture portals
  close immediately, including while the new lazy page is loading. The avatar is
  keyed by page too, cancelling old timers/observers. Owner checks prevent stale
  Capture cleanup from clearing a newer sheet.
- `aria-hidden`, `inert`, pointer-event, blinking, Reduced Motion and sheet-following
  behavior remain. Fullscreen API and iOS native video fullscreen events hide the
  companion. Listener cleanup follows the existing component lifecycle.
- Finance Lock remains independent. Actual PIN dialogs, other modal overlays and
  Genesis retain safety behavior. Unsafe keyboard/landscape/short viewport
  geometry may hide the companion.

## Verification

- Full Vitest: 182 files / 1,391 tests passed. TypeScript, lint and production-mode
  build passed before staging promotion; CI/deployment outcomes are in the delivery report.
- Targeted tests cover every route's global + markup, left placement, control
  collisions, ordinary status geometry, non-Today Capture, page-change timer/portal
  cleanup, About exclusion, native fullscreen and Finance Lock.
- The existing Today browser suite covers cards/calendar scrolling, both Capture
  entries, resizing, quick reopen, keyboard/landscape, Reduced Motion and overlays.
- About's original gestures remain covered; its real-overlay test uses Apps Drawer,
  because the approved policy removes About's global Capture entry.
- `avatarRouteBrowserValidation.mjs` runs actual App/pages at 320/390/1440px with
  synthetic providers and intercepted in-memory repositories. It checks corners,
  scroll stability, page entries, Review hit targets, history, Account/Genesis,
  local-only Cosmos Tarot and the real Anime player using locally generated video.
- Production-mode PWA validation checks offline About/Wave and navigation to
  Records/Exercise with standing avatars and safe Capture hiding/cleanup.
- Firestore Emulator rules and five Functions packaging supplement frontend checks.
  After staging is Ready, deployed SHA, eight routes, assets, manifest, worker cache
  and unauthenticated Functions protection are checked. Actual CI/deploy identifiers
  are supplied in the delivery report.

No finance, PIN, Auth, Guest, Genesis Boot, Firebase, Rules, Netlify configuration,
Production or artwork changes. No real account/data writes or paid API calls.
Firebase parity is not authoritatively verified. Parts 4–6 are excluded.

## Release baseline / rollback reference

- SHA: `70f8c5d6865d7d22f8c1ef3317fdbe5a29010b2c`
- Ready staging deploy: `6b0037cb38f4aba3e53765bd`
- Staging promotion is authorized; rollback and Production promotion are not performed.

## Owner acceptance remaining

At https://staging--edenos.netlify.app on iPhone Safari, installed PWA and desktop:

1. Visit all target pages: Review lower-left, other approved pages lower-right,
   About's own character only, and no visible global character in Account.
2. Scroll text/cards/charts continuously: fixed standing pose, no jumping/perches.
   Verify Review's actual fields and Save reflection remain usable.
3. Verify global + only on Today and its accepted perch/return; test quick reopen
   and page-specific Finance/Exercise/Records entries.
4. Navigate/back/forward with sheets open: no old sheet, body input shield or
   delayed perch. Check refresh/deep links and PWA offline navigation.
5. Check Locked/Unlocked, actual PIN dialog, Genesis, player/fullscreen, local
   Cosmos controls, keyboard, landscape, safe areas, text zoom and Reduced Motion.
6. Verify About's Smile/Think/Wave are unchanged. Visual QA does not require real
   Guest sign-out, financial/reflection writes or paid AI requests.

Chrome emulation does not replace real Safari or installed-PWA acceptance.
