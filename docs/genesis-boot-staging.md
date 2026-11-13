# Genesis Boot Sequence — staging review

## Audited baseline and scope

The read-only preflight verified `origin/main` at `89d9aa3d98edaa003232e0091cd2e2e6607ba34b` and `origin/staging` at `0d5c765dbcce9ba333fe24e56ea4fc6071be4223`, with identical trees. Mobile Paste / FX PR #10 and Production PR #11 are merged. The feature starts from that main baseline in a separate worktree and targets staging. Existing worktrees and historical QA files are preserved.

This is a visual-only addition. It changes the application composition at `main.tsx`, adds a section in the existing Account dialog, and introduces `src/boot`. It adds no package, page, remote asset, API request, database field, or data write. Authentication, routing, theme persistence, PWA registration, financial calculations, OCR, and function implementations are unchanged.

## Integration and behavior

`GenesisBoot` sits inside the existing Firebase authentication and records gates. Children mount immediately: boot playback never gates subscriptions, rendering, or initialization. Automatic playback waits until all three record streams and user settings are loaded. Errors, a pending PWA update, the privacy lock, and unconfirmed drafts suppress playback. If these states interrupt playback, the animation disappears immediately and does not resume automatically.

Automatic playback is restricted to an entry at `/` without a query or hash, and skips background tabs. User interaction before readiness suppresses automatic playback, so it cannot open over work already started. All deep links open normally. Popstate/hash navigation, leaving the foreground, Tab, application keyboard shortcuts, Escape, and Skip dismiss the decoration. Replay preserves the current route and is disabled during pending Account authentication actions, account conflicts, or account errors. The animation applies no body lock, inert state, route replacement, or theme change.

The cinematic sequence runs for 8 seconds: Genesis (0–1.2 s), Core Awakening (1.2–3.2 s), System Ready (3.2–4.8 s), Welcome Back (4.8–6.8 s), and Enter Your Universe / final fade (6.8–8.0 s). A subtle CSS glow breathes during Core Awakening and System Ready, then pauses. The last 1.2 seconds gently dissolve the overlay into the already running app without modifying homepage animation or delaying initialization. The existing EdenOS icon, geometry, layout, palette, and architecture are preserved. Orbital rings use local SVG/CSS. There are no random assets or runtime dependencies.

Account → Welcome experience contains **Show Boot Animation** and **Replay Boot Animation**. The preference uses the existing device-local settings pattern (`localStorage`, key `edenos.boot-animation.v1`), without changing cloud user settings. It controls future automatic playback; explicit replay remains available when the workspace is ready. Replay closes Account first and gives its existing focus restoration a short turn before focusing Skip.

The tab marker is `sessionStorage` key `edenos.genesis-played.v1`. It is claimed before playback, including skipped/interrupted playback, so a refresh or remount cannot loop. A new tab follows the browser's sessionStorage semantics. If sessionStorage is unavailable or unwritable, automatic playback is skipped; explicit replay still works. Preference save failures show an inline message and keep the current in-memory choice.

Reduced motion skips automatic playback. Explicit replay shows a static welcome for 600 ms, with no orbital motion or transitions. Changes to reduced-motion preference dismiss an active sequence. Timers, media listeners, navigation listeners, and pending frames are cleaned up. A visual error boundary preserves the app when the animation fails; a CSS visibility/pointer-events deadline releases the screen even if JS completion fails.

## Validation

- 44 focused Vitest cases: first playback, exact 8-second stage boundaries, final-fade Skip and full-duration replay, StrictMode, same-tab refresh/remount, Skip/focus, keyboard shortcuts, replay, toggle, storage failures, reduced motion, deep links, readiness and user interaction, actual authentication gates, pending Account actions, error recovery, PWA updates, privacy lock, drafts, unmount cleanup, and visual failure isolation. Synthetic fixtures only; no writes.
- Full Vitest suite: 1,125 tests in 165 files passed (baseline: 1,081 in 162 files).
- TypeScript, lint, and production build passed. The existing large-chunk advisory remains; no animation library was added.
- All five existing Netlify Functions packaged successfully with esbuild; their source/configuration is unchanged.
- Chromium browser harness: 82 assertions passed at 320×568, 390×844, 844×390, and 1440×900. Checked all stages, the matching 8-second CSS deadline, orbital-stage glow activation, 44px Skip target, overflow, theme restoration, same-tab refresh suppression, replay/Skip, reduced motion (including disabled glow), zero animation network requests, and browser errors. Another 37 real-time visual assertions passed for measured stage boundaries, actual glow breathing, the held Welcome Back stage, the final dissolve, and the independent CSS failure escape. Stage screenshots were reviewed at all four sizes.
- The temporary synthetic harness and screenshots are local QA artifacts, not included in the release.

## iPhone / installed PWA review

1. Open the Deploy Preview in a fresh Safari tab; authenticate normally. The animation must appear only after the workspace is ready. Check Genesis to 1.2 s, Core Awakening to 3.2 s, System Ready to 4.8 s, Welcome Back to 6.8 s, then Enter Your Universe and a gentle reveal of the existing homepage at 8.0 s. The orbital-stage ambient glow should breathe subtly.
2. During playback tap Skip, and check that homepage actions work immediately. Check portrait/landscape, safe-area spacing, and no horizontal scrolling.
3. Refresh and navigate through existing pages: no repeated automatic playback. Open an Expenses/Cosmos deep link in a fresh tab: the route and query/hash must remain intact, with no automatic overlay.
4. In Account, turn off Show Boot Animation; open a fresh tab to the same origin and confirm no automatic playback. Use Replay Boot Animation and verify that Account closes, Skip works, and the current route remains unchanged. Re-enable for future sessions. An existing tab keeps its seen marker across preview updates; use Replay to inspect the refined sequence without resetting session protections.
5. Enable iOS Reduce Motion: no automatic animation; explicit replay is a short, static welcome.
6. Repeat launch, Skip, replay, refresh, and orientation checks after installing this preview as a PWA if supported. Browser/PWA session restoration follows Safari's sessionStorage lifecycle and may retain the seen marker across reopening.
7. Check existing upload/paste and FX screens visually without submitting financial records or invoking paid OCR. Existing PWA update prompts must take precedence over the welcome.

Desktop/mobile emulation does not replace real Safari or installed-PWA acceptance. No real financial records, authentication accounts, or paid Gemini calls were created for automated QA.

## Release boundary

The PR targets **staging**. The current request explicitly requires approval before merging, so verification uses its Netlify Deploy Preview. The staging branch and Production remain unchanged until separately authorized. After review, merge only to staging and verify that branch deploy before considering any later Production request.
