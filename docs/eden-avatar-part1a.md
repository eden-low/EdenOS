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
- A hidden CSS probe measures all four iPhone safe-area insets. Available
  headroom, viewport panning and control collisions determine full body, bust
  or hidden presentation. Hands extend only three pixels over the sheet edge;
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
