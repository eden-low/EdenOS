# Eden Avatar — Part 1A

Scope: a decorative Today companion and Capture interaction only. No About,
Expenses animations, Genesis events, account/data contracts or backend changes.

## Visual source and assets

The approved **伊甸OS翼徽休闲少年角色立绘** defines Avatar Base v1. The original
independent character supplies identity details and the Eden Avatar 2.0 concept
board supplies style. All original references remain outside Git. The derived
`frontend/src/components/avatar/assets/eden-base-v1.webp` is a purpose-made
transparent 2 × 2 animation atlas, 1024 × 1024, approximately 201 KB. It retains
curly hair, black glasses, black shirt with a white/blue **wing** mark, light cargo
pants, backpack and cat charm. The old triangle logo must never be restored.

Tool: built-in ImageGen, followed by deterministic resizing/WebP encoding with
the existing Sharp installation. No paid API client or key was used. Prompt:
preserve approved anime identity and outfit; create four transparent equal cells,
standing open/closed eyes and upper-body perched open/closed eyes; align both
hands on an invisible horizontal panel edge; preserve the wing mark, backpack
and charm; no scenery, UI, labels, panel or triangle logo. Reference originals
and intermediate full-size generation outputs are not shipped.

## Integration

- `EdenAvatarProvider` is enabled only on Today. The decorative portal is inert,
  hidden from accessibility APIs and cannot receive pointer input or focus.
- Every `CaptureSheet` publishes its real content element through one optional
  context bridge. Dashboard and mobile entries retain their existing form/draft
  behavior and focus restoration. An owner token prevents one sheet's cleanup
  from clearing another sheet's anchor.
- The TypeScript reducer implements `idle → attentive → moveToSheet → perched
  → returning → idle`. Timers clean up when interrupted; reopening cancels return.
- SVG embeds the derived atlas. CSS performs occasional blinks and a short
  attentive tilt; body anatomy is illustrated rather than procedurally drawn.
- During Capture, animation-frame rect measurements follow CSS entrance,
  transformed desktop dialogs and changing content height. ResizeObserver,
  scroll, orientation/resize and VisualViewport events update positioning.
- A hidden CSS probe measures all four iPhone safe-area insets. Idle uses only
  the standing full body or hides if space/control collisions prevent a safe fit.
  The bust is reserved for an open Capture; layout never selects a pose.
  Hands extend only three pixels over the sheet edge;
  the close control and form remain clear. Other dialogs, discard confirmation,
  privacy lock and Genesis overlays suppress the companion.
- Reduced Motion skips travel and blinks. Hidden coordinates are retained so a
  return does not start at the screen origin. Idle layout does not animate on
  first mount. The atlas is included in the existing PWA precache; no update or
  service-worker activation policy is changed.

## Verification

From `frontend`:

```powershell
npm test
npx --no-install tsc -b
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# In a second shell:
node scripts/avatarBrowserValidation.mjs
```

The browser script uses real Today, MobileNavigation and CaptureSheet components
with in-memory contexts. It intercepts the two read repositories and blocks
Firebase/Functions traffic. It never starts real authentication, confirms a
record, uploads an image or calls OCR. Diagnostic harness files, results and
screenshots live under the Git-ignored `frontend/artifacts/browser-validation`.
Coverage includes 320/390/1440px, both available entry points, actual sheet edge,
form height changes, close/return, short landscape/keyboard viewport, privacy
lock, Today-only lifecycle and Reduced Motion. These are Chromium synthetic
checks, not real iPhone Safari acceptance.

### iPhone scroll acceptance fix

The first iPhone acceptance found that scrolling past controls sometimes changed
the idle companion to its Capture bust. Collision layout had selected `bust`, and
the sprite treated that layout mode as a pose even without an open Capture.
Idle layout now returns only `full` or `hidden`; the renderer additionally gates
the perched pose on an open Capture, including during the close/return commit.
The existing art, travel animation, sheet-edge geometry and safe-area measurements
are unchanged. Regression tests reproduced both the old layout fallback and the
visible sprite switch before the fix. Browser checks now sweep all Dashboard
sections including calendar in both scroll directions, introduce a deterministic
idle obstruction, and check the actual sprite immediately after Capture closes.
Fix verification: 176 test files / 1,337 tests, TypeScript, lint, production build,
five Functions packages and synthetic browser regressions passed. The browser
run covers 320/390/1440px, all seven Dashboard sections, both available Capture
entries, close/reopen, landscape/keyboard viewport and Reduced Motion. Real
iPhone Safari/PWA scroll acceptance remains an owner check on staging.
Pre-fix rollback reference: SHA `e3856c16fbca1c80789d73b0a07819140d725c23`,
staging deploy `6affdaa2d9d6b403036b21d6` (`ready`); no rollback performed.

Local verification on 2026-11-20: 176 Vitest files / 1,336 tests passed;
TypeScript, lint and production build passed. The existing large-chunk build
advisory remains. Firestore Emulator rules suite passed against demo project
`demo-edenos-rules`; all five existing Netlify Functions packaged successfully.
The synthetic browser run passed all viewport/entry combinations, rapid reopen,
Reduced Motion, privacy lock and Today-only cleanup with no runtime exceptions.
Screenshot/result artifacts remain local and are not part of the deployment.

Pre-change staging reference: SHA
`761062386ce0f5a82a3c2a8cfbd608f98fdc5fa0`, Netlify branch deploy
`6afdb20369b490f7ad264a11` (`ready`). This is a rollback reference only;
rollback requires separate approval. Production and sensitive configuration
are outside this release. Firebase environment parity is not verified.

## Remaining owner acceptance on staging

Use https://staging--edenos.netlify.app on iPhone Safari and the installed PWA:

- Confirm visual identity, wing mark, idle size/blink and natural two-hand perch.
- Test both Capture entries, close, rapid reopen, form changes and dirty-dismiss
  confirmation; verify focus and every form/close control remain usable.
- Test notched safe areas, Safari toolbar expansion/collapse, portrait/landscape,
  keyboard open/close and page panning with larger text/display zoom. Hiding is
  expected if the sheet leaves insufficient headroom.
- Check Reduced Motion, privacy lock, other dialogs and navigation away from
  Today; confirm that the avatar never appears above protected overlays.
- After receiving the normal app update, test PWA cold launch and offline avatar
  display. Preserve any valuable Guest identity; this visual acceptance needs
  no confirmed financial/exercise writes and no OCR requests.
