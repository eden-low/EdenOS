# Eden Avatar Part 2.2 — Finance Lock decoupling

## Scope

Finance Lock protects financial values and operations. Its persistent Locked state
does not hide Today’s companion or disable About’s Smile, Think and Wave buttons.
Neither avatar subscribes to `PrivacyLockContext` anymore. Changing the lock state
does not recreate the avatar or reset its action timers.

Actual open dialogs (including the PIN unlock dialog), alert dialogs and Genesis
Boot still interrupt About interaction and hide Today’s companion. Capture keeps
its existing dedicated sheet anchor, movement and perched pose. Collision hiding,
viewport/keyboard measurements, Reduced Motion and the decorative avatar’s
`aria-hidden`, `inert` and pointer-event rules are unchanged.

The About paused message now describes dialogs and the welcome screen. Existing
artwork, Wave v2 sequencing, Smile/Think, routing and layout are unchanged.
No Part 3 work is included.

## Privacy boundary

No financial, PIN, Auth, Guest, Genesis, Firebase, Firestore Rules, Netlify or
Production implementation/configuration changes. A regression test uses the real
PrivacyLockProvider and FinancialAmount with an in-memory verifier seam: all
three gestures work while money remains masked; gestures never invoke PIN
verification; opening the actual PIN dialog blocks the avatar; a wrong PIN keeps
the amount masked, and a valid PIN reveals it through the existing flow.

## Verification

- Full Vitest: 182 files, 1,375 tests passed.
- TypeScript, lint and production-mode build passed before staging promotion.
- Today browser harness: 320/390/1440 widths, every Dashboard section and calendar
  while locked, both Capture entries, sheet resizing, lock changes while perched,
  landscape/keyboard hiding, rapid reopen, Reduced Motion and real overlay hiding.
- About browser harness: locked/unlocked actions, mid-Wave lock/unlock, locked
  keyboard/Reduced Motion, real Capture and Genesis blocking, responsive layouts,
  200% text, navigation/history/deep links and offline loaded artwork.
- Production-mode PWA harness: synthetic signed-in context, service-worker cache,
  offline About reload and locked Wave playback. No real authentication or data.
- Existing financial/privacy, Genesis and Guest/Auth tests remain in the full suite.
- Read-only staging smoke checks routes, deployed SHA/assets, PWA and unauthenticated
  Functions protection. Firestore Emulator ownership/finance/isolation rules passed;
  all five Netlify Functions packaged successfully.

Machine-generated logs/screenshots are local ignored artifacts, never deployed.
Exact CI/deployment results are recorded in the delivery report.
Firebase environment parity has not been authoritatively verified.

## Release and rollback reference

Baseline staging: `a5bc4e402f12f1e012acb7b0bd196c7bdc60667f`.
Previous Ready deploy: `6b0026b0b21f1ead3fe3c563`.
Staging promotion is explicitly authorized; Production is excluded.
The reference identifies a rollback candidate, not authorization to roll back.

## Owner acceptance remaining

At https://staging--edenos.netlify.app, on iPhone Safari, installed PWA and desktop:

1. With Finance Lock enabled and Locked, scroll Today through cards/calendar:
   standing/occasional blinking or safe collision hiding, never an idle perch.
2. Open Capture with mobile + and Dashboard Capture; verify movement, edge alignment,
   close/return, rapid reopening, landscape, keyboard and safe areas while locked.
3. On About, run all three actions while Locked and Unlocked; change lock state
   during playback and verify no reset. Check keyboard/focus and Reduced Motion.
4. Verify amounts remain masked and finance operations still require the PIN.
   Open/cancel the actual PIN dialog: the real overlay pauses/hides the avatar,
   and its dismissal restores interaction without unlocking financial values.
5. Check Genesis, foreground/background, PWA refresh and offline loading with the
   installed app’s existing session. Do not sign out a valuable Guest identity.

Automated Chrome emulation is not iPhone Safari or installed-PWA acceptance.
