# Eden Avatar Part 2 — About Eden

## Scope and baseline

An authenticated, lazy `/about` page titled **About Eden**, with subtitle
**My Little Universe**. It adds the Hero, Who Am I, My EdenOS Story, My Interests
and Interactive Eden areas. Baseline staging:
`f8f8baeaefb530c5471f2f7de416cc2d6ca33516`, deploy
`6affe19a7c310115dea862fe` (`ready`). This is the rollback reference, not an
instruction to roll back. Production stays at its existing release.

## Files and behavior

- `src/pages/AboutPage.tsx`: page composition, title lifecycle and scrolling to
  known section fragments after a lazy deep-link mount.
- `src/about/aboutContent.ts`: all editorial text, section IDs, action labels,
  status announcements and image descriptions. The biography explicitly says
  **Personal introduction · to be added**. No employer, career, location or
  social accounts were invented. Interests are those supplied in the brief.
- `src/about/AboutHero.tsx`: the accepted Part 1 standing illustration, cropped
  from the existing derived atlas, with the wing emblem unchanged.
- `src/about/AboutInteractiveAvatar.tsx` and `aboutAvatarMachine.ts`: a separate
  accessible character with Smile, Think and Wave. It does not reuse the Today
  decorative component or alter its `aria-hidden`, `inert`, pointer handling,
  Capture bridge, state machine, layout or safety logic.
- `src/about/about.css`: existing night/ivory theme tokens, violet glow,
  restrained star texture, glass panels, responsive layouts, 44px+ controls,
  visible focus, safe-area-aware horizontal padding and Reduced Motion.
- App, Navigation and route mapping: `/about` and `/#/about`, desktop rail and
  Apps Drawer. The existing rail scrolls in short desktop windows so adding an
  eighth destination cannot cover the logo/account controls.
- `vite.config.ts`: only the existing PWA precache glob gains the two derived
  About WebP assets. Update, activation, auth, Firebase and Netlify configuration
  policies are unchanged. About code/CSS/art load through its lazy route rather
  than the Today entry; SW precaching still happens under the existing policy.

## Artwork and gestures

The original wing-logo character reference remains outside Git. Only derived
runtime assets are committed:

| File | Size | Role |
| --- | ---: | --- |
| `src/about/assets/eden-about-hero.webp` | 41,290 bytes | Accepted standing visual, extracted from Part 1 derived art |
| `src/about/assets/eden-about-gestures.webp` | 319,340 bytes | New 2048 × 1024 transparent atlas, 4 columns × 2 rows |

The new atlas was generated with built-in ImageGen, with the approved local
wing-logo illustration as the identity/style reference. No external paid AI API
or Superdesign generation credits were used. Existing Sharp only resizes and
encodes the resulting asset; it does not draw or distort the gestures.

Cells, left to right, top to bottom: 0 idle; 1 happy closed-eye Smile;
2 hand-on-chin Think; 3 raised-palm Wave; 4 open-eye Smile;
5 alternate thoughtful gaze; 6 inward Wave arm; 7 outward Wave arm.
The sequence changes actual illustration frames, with no CSS stretching or
rotation pretending to create a new gesture. Wave uses `3,6,7,6,3`; Smile uses
`1,4,1`; Think uses `2,5,2`. All finish at idle cell 0.

Each trigger increments a local run token. Repeated triggers restart immediately;
stale frame/completion events cannot finish a newer gesture. Timers cancel on
unmount, interruption or preference change. Reduced Motion displays one still
gesture for one second, then returns to idle. There is no movement interpolation
or repeating frame cycle in that mode. Native buttons support Enter/Space,
retain focus and announce the selected gesture once through a polite status.

Privacy Lock and existing dialogs/Genesis overlays pause controls and reset the
gesture. The whole page stays inside the existing FirebaseAuthProvider boundary
in `main.tsx`. No new auth entry, Guest transition, backend request, saved
preference or financial write was added. App enables Today’s decorative avatar
only on Today, so it is absent on About.

## Verification and reproducibility

From `frontend`:

```powershell
npm test
npx --no-install tsc -b
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# After the build has finished, in another terminal:
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
# After staging reports Ready at the tested commit:
node scripts/aboutStagingValidation.mjs <full-staging-sha>
```

Browser fixtures run the real App, navigation, About, Today, Capture and Genesis
components with synthetic contexts and intercepted read repositories. Account
and data methods throw if invoked. Firebase and deployed Functions traffic is
blocked in the browser. Every run uses a fresh Chrome profile and an allocated
debugging port; Browser.close terminates that exact instance. Vite transforms
the fixture HTML only after writing its entry, avoiding stale hot-refresh root
executions. Run browser checks after source-generating builds finish.

Coverage includes direct access, hash/section deep links, desktop and mobile
navigation, browser back/forward, reload, all gestures and return, repeated
triggering, Enter/Space, focus indication, Reduced Motion, Privacy Lock, real
Genesis Replay/Skip, no Today companion on About, 320/390/844/1440px, short
desktop rails, night/ivory themes, 200% text and emulated safe-area insets.
The original Today scrolling/Capture regressions are rerun independently.

The staging smoke verifies eight SPA paths, matching build SHA, lazy About
chunk and asset hashes, manifest/icons/worker, the About precache entries,
offline protected `/about` refresh, and five unauthenticated Functions rejecting
before any upstream calls. Offline gestures are also exercised in the loaded
synthetic About page. This does not claim signed-in real-device acceptance.

Local Vitest result: **181 files / 1,362 tests passed**. TypeScript, lint,
production build and all five Functions packages are required release checks.
The existing large-chunk build advisory is tracked separately from failures.
Screenshots/results remain in ignored `frontend/artifacts/browser-validation`.
Firebase environment parity is **not verified**; no environment values changed.

A static design record was imported into Superdesign from the actual rendered
page, using the current agent's HTML and inline derived assets (no generation
credits, no original-reference upload). Draft `d4e864a5-fe32-427b-802a-4758e9014931`,
version 1, was refetched and verified. The
[static design preview](https://p.superdesign.dev/draft/d4e864a5-fe32-427b-802a-4758e9014931)
is supplementary; staging remains the formal acceptance environment.

## Manual acceptance

Use https://staging--edenos.netlify.app/about with an existing safe session. This
page needs no financial/exercise confirmations and no OCR requests.

- iPhone Safari: navigate from Apps, directly open `/about`, refresh the deep
  link, use Back/Forward, scroll all sections, check the wing emblem, gesture
  identity and natural hands, trigger rapidly and open/close Capture.
- iPhone standalone PWA: receive the normal update, cold-launch `/about`, check
  auth/privacy behavior, then check cached About and gestures offline. Verify
  notch/home-indicator/toolbar, portrait/landscape and enlarged text.
- Desktop: rail including a short window, keyboard Tab/Enter/Space, focus ring,
  all three gestures, idle restoration, both themes, privacy lock and Genesis
  Replay/Skip. Confirm Today’s idle/scrolling/Capture still behaves as accepted.

## Part 3 handoff — architecture only

- `/about` is a lazy leaf of the existing authenticated App. Content is pure
  TypeScript; UI, editorial changes and gesture behavior can be reviewed apart.
- `aboutAvatarMachine` is local to About. Extend its closed action union only
  alongside dedicated art/frame metadata and lifecycle/accessibility tests.
  Run tokens and cancellation must continue to guard rapid/interrupted actions.
- Today remains a separate decorative system using AvatarCaptureContext. Do not
  route About button events into it or weaken its accessibility/pointer safety.
- There is no module-event bus, clothing inventory, expenses animation, About
  account integration or Part 3 code in this release. Future event adapters must
  be specified separately and keep data/permission boundaries explicit.

## ImageGen prompt

Use case: illustration-story. Asset type: transparent animation sprite atlas for
About Eden, matching the approved EdenOS Avatar Base v1 reference. Reference
image is identity and outfit authority. Preserve the detailed soft-shaded
anime/chibi illustration, dark curly hair, black rectangular glasses, same face,
black T-shirt with the small white/light-blue EDENOS WING emblem (never triangle),
silver necklace, light cargo pants, black sneakers, black backpack and white cat
charm. Create ONE strict 4-column by 2-row atlas, eight EQUAL SQUARE cells, ideally
2048x1024 (each cell512x512). Transparent background, no cell borders/text/scenery/
floor/shadows. Each cell shows exactly ONE entire full-body character, same
camera, same centered body position, same scale, hair near local y20 and feet
near y496, substantial clear margin left/right so raised hands fit. Top row,
left to right: 1 IDLE hands relaxed near pockets, small calm smile and open eyes;
2 SMILE A warm clearly happy smile, eyes gently happily closed, relaxed hands;
3 THINK A right hand resting naturally on chin, thoughtful small mouth and eyes
looking slightly up-left, other hand relaxed; 4 WAVE A right arm raised beside
head, elbow bent, open palm toward viewer, five natural fingers, friendly smile.
Bottom row, left to right: 5 SMILE B same happy-smile pose as Smile A, eyes open
with bright happy expression; 6 THINK B same hand-on-chin pose as Think A, eyes
glancing slightly right as if considering an idea; 7 WAVE B same raised arm as
Wave A but forearm/hand naturally moved inward slightly in an actual illustrated
wave; 8 WAVE C same raised arm but forearm/hand naturally moved outward slightly.
The three wave frames must depict actual DIFFERENT natural hand/forearm
positions, no stretched/rotated flat cutout, no extra limbs/fingers. Keep full
body/face position and scale consistent across all eight frames. All actions are
independent gestures rather than panel-perching poses. Match the original
character's identity and rich illustrative shading, not a simplified flat vector.
Both black glasses and white-blue wing emblem remain visible in all frames. No
old triangle emblem, no explorer costume, no props or text.
