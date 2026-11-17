# Genesis cold launch — staging review

Baseline: staging `f8cff23b38072b4f9e04a0e3991b59da82b7125e`. This is an isolated visual change on a separate branch, targeting staging through a PR. No staging merge or Production release is authorized by this implementation request.

## Audit and integration

The existing `GenesisBoot` is inside both Firebase authentication and Records gates. Consequently it cannot render on the unauthenticated choice screen, and the old tab marker suppresses restored-session playback. Its post-login session decisions remain useful and are retained.

`GenesisLaunchProvider` is now a visual sibling around the existing authenticated application and auth choice/status screens, inside the existing PWA provider. It always renders its children immediately. Firebase initialization, authentication gates, subscriptions, navigation and workspace rendering do not wait for the animation. It uses the exact existing `GenesisBootSequence` and CSS; the SVG, stage timings (1.2/3.2/4.8/6.8/8.0 s), glow and final fade are unchanged.

The Firebase provider gains only an observer hook for its existing status and in-memory Boot session snapshot. It does not change auth operations, persistence, identities, linking, Guest exit consent, conflict checks, credentials, Rules or account data. The existing inner `GenesisBoot` reports its error/privacy/PWA/draft protection state before paint. Startup may run while the initial identity observation is unresolved, but an active user authentication operation, authentication error or reported protection dismisses it immediately. No private workspace renders before the original auth gate confirms the identity.

Startup playback is scheduled in a passive effect so React's development StrictMode cleanup cancels its probe frame before making a claim. If an already-ready authenticated tree registers its frame first, that frame resolves the same launch decision before authorizing any welcome. A WeakMap scoped to the current Document preserves the decision across root remounts. Neither this state nor the opaque first-auth token contains a newly persisted account identifier.

## Playback policy

- A visible canonical `/` entry, without a query or fragment, can start once when evidence indicates a fresh document/application entry. It reads modern navigation type, falls back to the legacy navigation type, and combines this with the existing tab marker, history length, same-origin referrer, opener and standalone mode. Some browsers retain an initial about:blank entry, so a history of up to two entries is supporting evidence rather than proof of a fresh session.
- Reload, back/forward navigation and known discarded-document restores are excluded even if sessionStorage has been cleared. Ordinary same-tab entries with a seen marker are excluded. A new tab with a copied opener marker and a fresh standalone entry with retained tab storage can qualify when their navigation/history signals support it.
- Without timing APIs, only a reliable fresh marker plus a short history and no same-origin referrer is accepted. Without reliable storage, explicit fresh-navigation evidence can still authorize one in-memory playback. If both timing and storage are unavailable, startup is skipped safely. Storage exceptions never block rendering or login. The existing preference key and session marker are reused; no new storage keys, dependencies or backend requests are added.
- Initial playback counts as the welcome for the first successful authenticated session in that document, whether restored, Google or Guest. This one-use credit has no timeout: even a slow login/popup does not produce a consecutive second animation. If interaction cancels startup before it actually plays, a successful explicit sign-in retains its normal welcome. Subsequent sign-out/sign-in, Guest exit/Google login and account switching retain the existing per-auth-session welcome behavior and readiness checks.
- Startup owns automatic restored-session playback; the inner provider never adds another restored-session animation on refresh. Manual Replay remains in Account settings, uses the existing readiness guards and dismisses any startup visual first. The device preference affects future automatic playback. Reduced motion skips automatic playback and retains the existing explicit static 600 ms Replay.
- Skip, pointer/keyboard interaction, navigation, hiding, pagehide, freeze and persisted pageshow dismiss startup. None of these events starts playback. A dismissed decision is never resurrected on resume, error recovery or root remount. Frames, listeners and sequence timers are cleaned up. A visual render failure uses the existing sequence boundary and leaves the login/application surface usable.

## Platform limits and sources

The web platform does not provide a uniform, trustworthy native PWA-process launch identifier. The implemented policy is a document/navigation inference, not a claim to detect an iOS process boundary. A normal same-document iPhone/PWA resume never replays. If iOS reconstructs an evicted standalone document and reports it exactly like a new `navigate` entry with a short history, it can be indistinguishable from a genuine cold launch. Conversely, restored/duplicated tabs with retained markers and no distinguishing navigation/opener evidence may conservatively skip. No time-away heuristic, unload-triggered marker deletion, forced reload, URL modification or Firebase change is used to fake a new session. Manual Replay remains available.

The [Navigation Timing specification](https://www.w3.org/TR/navigation-timing-2/) distinguishes navigate/reload/back_forward, not native application sessions. [Mozilla's sessionStorage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) describes refresh/restore persistence and opener copying. [Chrome's lifecycle guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api) explains frozen/discarded pages and missing termination events; [Mozilla's pagehide documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event) notes mobile termination events are unreliable. These limits require real iPhone Safari and installed-PWA owner acceptance. Standalone emulation in Chromium is not an installed iOS PWA test.

## Validation

- Full Vitest: 1,246 tests across 167 files passed, including 66 additional cases. Existing Guest recovery/linking, financial and OCR regressions remain in the full suite.
- TypeScript, lint and production build passed. The existing large-chunk build advisory remains.
- 96 synthetic browser assertions passed at 320/390/1440 px with actual source components and built CSS. Covered startup before login, no premature private content, restored Google/Guest, first-login deduplication, sign-out/sign-in, observed account switching without stacked overlays, token refresh, mandatory Guest exit consent, all eight-second stages, Skip/Replay, preferences, reduced motion, errors/privacy/PWA/drafts, storage denial and deep links. Reload/history traversal and standalone-entry classification use separate native-clock browser contexts because test clocks replace Performance APIs. No unexpected browser errors or backend/account/paid API requests occurred.
- PR CI and Deploy Preview are independently verified before delivery. Browser-only published-component checks substitute synthetic auth/data I/O and readiness without changing the deployed site. Real Google/Guest operations remain owner-operated. No real user data or paid Gemini calls are used.

## Owner acceptance after preview review

1. Open canonical `/` in a genuinely new browser tab: expect the approved eight-second startup, or Skip. Confirm the existing login choice screen appears normally afterward. Do not change the URL to trigger playback.
2. Use a disposable Guest only when testing account exit. First successful Google/Guest entry following this startup must not play a second consecutive welcome. Later explicit sign-out/sign-in should still welcome once.
3. Refresh and navigate; expect no automatic startup. Enter an Expenses/Cosmos query/hash deep link; preserve it without an automatic overlay. Account Replay should preserve that URL.
4. Test installed-PWA fresh document startup separately from background/resume. Background during playback should dismiss it, and returning to the same session should not replay. Record iOS version and whether the OS restored or rebuilt the document if behavior differs.
5. Verify disabled preference, Reduce Motion, Skip/Replay, privacy lock, PWA update and error recovery. The animation must yield to existing protections and login actions.

Stop after the focused PR Deploy Preview is verified. Do not merge to staging or main without separate owner authorization; do not deploy Production.
