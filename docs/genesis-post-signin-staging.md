# Genesis post-sign-in playback — staging review

## Scope and baseline

This change starts from staging `7747760ff1d9859b5d227565722e1c5bf48998c2` (merged Genesis PR #12). It targets staging through a separate feature branch and PR. Main remains `89d9aa3d98edaa003232e0091cd2e2e6607ba34b`. No merge or Production deployment is authorized by this implementation request.

The approved animation component and CSS are unchanged: Genesis 0–1.2 s, Core Awakening 1.2–3.2 s, System Ready 3.2–4.8 s, Welcome Back 4.8–6.8 s, Enter Your Universe / final fade 6.8–8.0 s. Glow, layout, branding, Skip, and reduced-motion visuals are preserved.

## Session decisions

`BootAuthSessions` is a UI-only observer scoped to the existing FirebaseAuthProvider instance. It tracks the last UID **in memory only** and exposes an opaque, one-use playback decision. Neither the UID nor another account identifier is added to persistent storage. Existing `edenos.genesis-played.v1` and device-local animation preference keys remain the only Boot storage keys.

- The first restored authenticated identity keeps the existing tab-session marker behavior. Refreshing a tab does not replay an already seen initial welcome.
- A signed-out → authenticated transition, or a different authenticated UID, creates a new one-use decision. This permits playback after successful Google sign-in, Guest entry, sign-out/sign-in with the same account, and switching accounts, even when the tab marker already says `seen`.
- Repeated observations of the same UID (including refresh-style notifications), linking Google to the same Guest UID, ordinary React remounts, and navigation do not create new decisions. The in-memory claim prevents remount replay even if the tab marker disappears.
- Existing UI authentication actions are observed until their original promises settle. An early authenticated observer callback cannot start playback while an action is pending. A candidate from a failed or cancelled operation is discarded. Original auth results/errors and Firebase operations are preserved.
- The published session snapshot is checked against the UID of the existing rendered auth tree, so a new account's decision cannot apply to the previous account's workspace.

`GenesisBoot` still waits for the existing record/settings readiness gates. Its children initialize immediately. A successful sign-in decision resets only the visual decision, without adding an application key or remounting the app. Rendering of an old session's animation stops immediately when its session changes or authentication becomes pending.

Automatic playback remains restricted to a canonical home entry (`/` with no query/hash). Disabled preference, reduced motion, backgrounding, prior user interaction, navigation, privacy lock, PWA updates, errors and drafts take priority. Skipped or interrupted decisions are consumed, so recovery/remounting cannot unexpectedly bring the overlay back. Manual Replay keeps its existing behavior and remains available only when the workspace is ready.

On explicit successful entry, the memory claim is sufficient even if sessionStorage is unavailable; writing the existing tab marker is best effort. Such a session still plays at most once, and a full refresh follows restored-session behavior (which skips automatic playback if tab storage is unavailable). Preference read/write failures remain nonfatal.

The Firebase authentication service, auth configuration, persistence selection, account-safety checks, sign-out behavior, identity-keyed data providers, account data, database schema/rules, OCR and Expenses implementations are unchanged. FirebaseAuthProvider gains only the UI observation bridge and wrappers that preserve the original action results and failures.

## Validation

- 27 added regression cases cover Google sign-in (including an unused synthetic account), Guest entry, sign-out/sign-in with same/different accounts, observed account switches, same-UID linking, safe Guest-to-existing-account switching, restored sessions, document refresh, StrictMode/remounts, duplicate auth notifications, deep links, pending/failed/cancelled authentication, readiness, preferences, reduced motion, interruption gates, and unavailable tab storage.
- Full Vitest suite: 1,152 tests in 165 files passed. TypeScript, lint, and production build passed. The existing large-chunk build advisory remains.
- 77 browser assertions passed at 320px, 390px and 1440px widths. Checks use the actual authentication UI/provider and Boot components with a synthetic auth service and empty synthetic read contexts. Covered successful entries, repeated sessions, ordinary remounts, duplicate observations, pending and failed candidates, preferences, reduced motion, deep links and refresh. No unexpected browser errors or backend/account/paid API requests occurred. The temporary harness is not shipped.

## Manual acceptance on Deploy Preview

1. Open the preview at `/`, sign in normally, and wait for workspace readiness. Confirm one approved 8-second sequence, or immediate access via Skip.
2. Sign out; the entry screen must remain unobstructed. Sign in again with the same Google account, then repeat with a different account and Guest entry. Each successful new session gets one welcome, subject to the preference and readiness protections.
3. Cancel or fail a sign-in; no welcome should appear. A slow popup must not trigger playback before success completes.
4. Refresh after playback, navigate, and reopen Account: no repeated automatic welcome. Replay remains available. Turn the animation off, sign out/sign in, and confirm automatic playback stays off.
5. Repeat with iOS Reduce Motion: no automatic animation; explicit Replay remains the existing static 600 ms welcome.
6. Enter through an Expenses/Cosmos deep link with a query/hash, sign in, and verify that the route is preserved without automatic playback. Do not submit real financial records or invoke paid OCR for acceptance.
7. Repeat in iPhone Safari, installed PWA and desktop. Existing storage/session-restoration browser behavior still applies.

Stop after the PR Deploy Preview is verified. Do not merge into staging or main without separate explicit authorization; do not deploy Production.
