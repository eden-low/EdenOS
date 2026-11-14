# Account UI cleanup — staging review

Account now opens with current status and Google/Guest actions before device settings. Theme, Privacy Lock and the existing animation preference remain on the account home. Replay uses an icon and short text while retaining its accessible name, `Replay Boot Animation`.

Tools & Diagnostics is a secondary view within the same Radix dialog, not a route or another modal. Back restores the account scroll position and visible trigger focus; reopening starts on Account. Closing, Escape, pending-auth restrictions and the existing Guest review/confirmation flow remain in place.

Privacy PIN setup, change, disable and unlock render inline to avoid stacked dialog focus traps. They call the existing privacy context operations, including the unlock retry deadline. Cancel clears the temporary fields and restores action focus. No privacy provider, authentication, UID isolation or persistence implementation changes.

Network Speed and Staging Version Diagnostics reuse their existing components. Opening Tools or expanding Network Speed does not run a test. Leaving Tools aborts active work through the existing unmount cleanup. Staging diagnostic build gating is unchanged: the panel and public build JSON are absent from ordinary/Production builds, and build JSON is excluded from SW precache.

## Validation

- Full Vitest: **1,296 passing tests in 171 files** (12 more tests than staging baseline).
- TypeScript, lint and ordinary production build: pass.
- Simulated Netlify staging build with synthetic client configuration: pass; no real credentials used.
- Five Netlify Functions packaged with esbuild; no function invoked.
- Existing Firestore ownership/Finance/settings rules regression suite: pass against an isolated localhost emulator with `demo-edenos-rules`; no live Firebase operation.
- **154 browser assertions**: 320×568, 390×844, 1440×960 and 390px standalone signal emulation; dark/light layouts, initially visible Guest actions, one modal, keyboard focus, scroll restoration, PIN cancel, explicit-only network work, safe mock failures, unchanged synthetic UID and no backend requests.
- **96 Genesis browser assertions**: approved eight-second stages, first login deduplication, later sign-in welcome, Skip, Replay, preference, reduced motion, storage failure, refresh/navigation/deep-link and interruption protections.
- Manifest, all three referenced PWA icons and generated service worker verified locally. No new dependencies or application network requests.

Browser checks use the actual built UI/CSS with browser-only synthetic auth/readiness and mock version/speed responses. Chromium mobile/standalone emulation is **not** real iPhone Safari or installed-PWA acceptance. It cannot establish iOS keyboard/safe-area behavior or reliable PWA cold-launch detection.

Existing advisories remain: npm reports 27 dependency vulnerabilities (lockfile unchanged), and Vite warns about chunks over 500 kB. No dependency or unrelated module changes are included.

## Owner review and release boundary

This PR targets staging and must not be merged without separate owner approval. Staging remains at `843f6d557b2a54d9b8d2252b5f0e39690cb6d531`, deploy `6af89b746cd19ca6eda0237d`, until approved. Main and Production are untouched. Firebase parity: **not verified**; no environment values, Rules or user records were changed.

After an authorized staging merge, review on the existing staging domain:

1. On iPhone Safari, installed PWA and desktop, open Account and verify status, Google connect and Guest exit are easy to find. Do not exit a valuable Guest identity.
2. Check System/Light/Dark, compact animation toggle and Replay; confirm approved Genesis timing and Skip remain intact.
3. Open Tools & Diagnostics, return to Account and close/reopen with touch and keyboard. Check focus, vertical scrolling, safe areas and numeric keyboard visibility.
4. Open then cancel Privacy PIN editing; with a disposable local setup, verify unlock/change/disable still use existing PIN validation.
5. Confirm diagnostics exist only on genuine staging builds and make requests only on click. Start/cancel a speed test only if its disclosed data use is acceptable.
6. Use synthetic/disposable sessions for Guest risk review. Real Google/Guest acceptance belongs on staging, not Deploy Preview.
