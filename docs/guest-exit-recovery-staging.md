# Guest exit and existing Google account access

This fix starts from staging `184cd96c3f9f91898e4b654c351d3c47e1407999` and targets staging through a separate PR. It does not authorize a staging merge or any Production release.

## Audit and root cause

- `AccountDialog` offered sign-out only for Google users. Both `FirebaseAuthProvider.signOutGoogle` and `firebaseAuthService.signOutGoogle` deliberately rejected anonymous users. A Guest trapped behind a blocked link conflict had no explicit way back to the authentication choice screen.
- Connecting Google uses `linkWithPopup` to preserve the Guest UID. An existing Google account raises a conflict; the provider then requests an authoritative Guest-data summary before allowing a separate, explicit existing-account switch.
- The summary uses `getCountFromServer` on `users/{uid}/weeklyReviews`. The checked-in Rules allow individual `get` operations on Weekly Reviews, but explicitly deny `list`. An aggregate is subject to list authorization, including for an empty collection. The summary rejects and the provider returns `existing-unavailable`, producing the reported message. An Emulator regression reproduces this with the unchanged Rules. No real user account or deployed Rules were inspected.
- Other failed server reads, browser storage access failures, or an unavailable pending conflict also produce that fail-closed state. These must not be interpreted as an empty Guest. The historical automated tests mocked successful aggregate reads and therefore missed the Rules mismatch.

The existing protected conflict path remains fail-closed. The fix does not skip the Weekly Review check, assume absent data, scan a guessed subset of week keys, or relax Rules. Complete history enumeration cannot be verified under the present access policy. Recovering access to an existing Google account is instead possible through a separately reviewed Guest exit.

## Data-safety behavior

Guest Account now always offers **Sign Out / Switch Account**, including when a Google conflict cannot be verified. This first prepares an in-memory review, with an eight-second bound on an unavailable summary. It never signs out or starts another login by itself.

The review distinguishes data found, completed checks reporting no records, and unavailable/unknown data. Every Guest receives the irreversible-access warning, including apparently empty Guests. Saved records remain under the old UID; this action never deletes, migrates, merges or overwrites them. EdenOS has no verified way to restore an exited Guest. A copied UID is not a credential. Unsaved work will be lost. Valuable Guests should stay signed in and link a Google account that is not already used by EdenOS; successful linking preserves the UID. An existing Google account cannot be merged here.

Leaving requires a fresh checkbox acknowledgement and a separate **Leave Guest and sign out** click. **Stay in Guest**, closing, or cancelling makes no auth change. Closing/reopening or starting a new review clears acknowledgement. The previously available verified-empty conflict switch also requires acknowledgement of potentially permanent Guest access loss.

The review's one-use exit closure is scoped to the original Guest. The adapter checks the current anonymous UID immediately before `signOut`; a stale review cannot sign out another Guest or a Google account. Concurrent/duplicate confirmation is rejected. Failure preserves the current session and pending conflict, allowing an explicit retry. Successful exit clears the credential choice and returns to the existing auth choice screen without creating an anonymous account or opening a Google popup. Google sign-in is then an independent explicit action; cancellation/failure remains on the choice screen.

The summary additionally protects persisted body measurements, which were previously omitted, and rejects malformed aggregate counts rather than converting them to zero. These strengthen the existing conflict guard. No stored record format changes.

Existing identity-keyed providers unsubscribe and unmount on exit; signing into Google mounts providers using that Google UID. No Guest records are imported. Genesis observes the existing auth outcomes: no playback over review, pending/error, or signed-out screens; successful Google/Guest entry plays once, subject to the existing preference, readiness, privacy/PWA, interruption, reduced-motion and deep-link guards. The approved eight-second sequence and CSS are unchanged.

## Validation

- Full Vitest: 1,180 tests across 165 files passed (28 additional cases).
- TypeScript, lint and production build passed; the existing large-bundle advisory remains.
- Firestore Rules regression script passed against a local `demo-edenos-rules` Emulator, including denial of Guest Weekly Review aggregation and permission for own Expenses aggregation. No production/emulator data import was used.
- 72 synthetic browser assertions passed at 320, 390 and 1440 px, with actual AuthProvider, AccountDialog, warning and Boot components and built application CSS. Covered empty/saved/unknown summaries, warning and consent, staying, failure/retry, explicit existing Google login, cancellation, UID retention, all eight-second stages, Skip, preference/reduced motion and deep links. No unexpected browser errors or backend/account/paid API requests.
- PR CI and Deploy Preview are checked separately before delivery. Real Google/Guest sessions and iPhone Safari/PWA acceptance remain owner-operated; synthetic auth I/O does not establish live Firebase popup compatibility.

## Owner review

1. On the preview, inspect the Guest Account **Sign Out / Switch Account** action. Review the warning without leaving; **Stay in Guest** and Close must preserve the session. Do not exit a valuable Guest merely to test.
2. Confirm linking a suitable unused Google account remains the preferred way to preserve a valuable Guest UID. Cancelling a popup must keep the Guest.
3. On staging only after separate merge approval, use a disposable Guest to review and explicitly acknowledge exit, then choose existing Google sign-in. Verify the existing Google workspace returns and the approved welcome plays once. Repeat cancellation/failure, Guest entry, refresh, deep links and Reduce Motion on iPhone Safari/PWA.

No Firebase Rules, schema, Firebase configuration, credentials, account documents, OCR, financial records, main or Production deployments are changed. Do not merge without owner review and authorization.
