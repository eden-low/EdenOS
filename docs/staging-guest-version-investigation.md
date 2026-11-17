# Staging Guest UI version investigation

Investigated staging baseline: `5b76bf2b992d1c4a9e98d8fa6da432ef64ddf77a`.
Netlify staging deploy: `6af860e12f5d78688e766144`, Ready.

## Confirmed evidence and remaining gap

The live staging HTML references `index-DHDo_Ako.js`, SHA-1
`696c483c09a6f7ccbdf5e08793c5ea938a4f37ed`. It matches the recorded staging
release artifact and contains both Guest account buttons and the informed-exit
warning. All 35 public files match their Netlify deployment hashes. The current
AccountDialog has no extra Guest-data condition that hides its exit button while
showing Connect Google account. Its structure matches the reviewed and local
builds. Isolated synthetic checks show both controls at 320, 390 and 1440 px.

The pre-PR-14 staging bundle `index-Di1JxO66.js`, SHA-1
`c66ef86be32a3846e1b325295d40f3a05c6382fc`, has Connect Google account but no
Guest exit. Both versions have Genesis. Seeing Genesis is **not** evidence of
loading the current bundle. Safari tabs support service workers without an
installed PWA.

The owner's iPhone's actual entry script, running JS, active/waiting SW and cache
contents cannot be inspected remotely in this environment. Its exact root cause
is **unconfirmed**. An old SW/page is a supported hypothesis, not a diagnosis.
Server-side deployment delivery is verified; device-side delivery is not.

Local isolated-browser experiments used the actual historical published SW,
Workbox registration, PwaProvider, update prompt, Genesis and AccountDialog,
substituting only synthetic auth/data I/O:

- With the old SW controlling a new tab, changing the server to current assets
  still produced old `index-Di1JxO66.js`, Genesis, Connect Google account and no
  Guest exit. Once the new worker installed, the update prompt appeared.
- With the worker update request deliberately failing, the new tab still showed
  Genesis and the old buttons, without an update prompt. No real account action,
  storage clearing, unregistration, update activation or paid call was performed.
- These establish mechanisms, not the owner's device state. Installation failure,
  a missing update check, dismissed UI or another client state require device
  evidence; no specific one is asserted.

HTML/JS/manifest/SW HTTP responses require revalidation. HTTP cache headers do not
bypass an active SW's precache or replace already-running JavaScript. The SW
precaches its app shell, uses a navigation fallback, and waits for user-approved
activation. The update prompt is covered by Account's modal; Later hides it for
the current PwaProvider lifetime. There is no continuously polling update check.

## Minimal diagnostic change

Only a genuine Netlify staging branch build (`NETLIFY=true`,
`CONTEXT=branch-deploy`, `BRANCH=staging`) receives the Account diagnostic panel.
Netlify's validated full `COMMIT_REF` is embedded as **Loaded Build SHA**. It is
never hard-coded to a historical release. An invalid staging commit fails the
build instead of displaying an invented version. Other contexts render no panel
and emit no metadata file.

The visible loaded SHA is separate from a manually checked **Server Build SHA**.
Expandable details show the HTML entry script filename, the running diagnostic
module filename and a snapshot of controller/active/waiting/installing state.
A SW's URL or state alone is not presented as a worker-version fingerprint.

The single Check server version button performs a same-origin, cookie-free,
`cache: no-store` GET of `staging-build.json` and reads `getRegistration()`.
There are no automatic requests, auth/Firestore imports, account identifiers,
storage writes, registration/update/activation calls or reloads. Only schema and
SHA are emitted by the build. HTML fallback, invalid JSON/schema/SHA, oversized
responses, offline/error cases and an eight-second deadline fail safely. Closing
Account aborts the check and prevents late results from updating another view.

The JSON asset is excluded from the generated SW precache. The check is a
non-navigation request, so the existing navigation fallback does not return an
app shell for it. Server data can differ from a loaded page; the UI explicitly
preserves and labels both versions. Neither a server JSON response nor an
animation proves what JS another tab is running.

**Limitation:** an already-running old bundle cannot gain this new panel until it
loads an updated build. An absent panel does not reveal exactly which old build
is running. Device Web Inspector remains the direct way to read such a tab's
actual script fingerprint before it updates. This PR improves future diagnosis;
it does not claim to repair the unconfirmed iPhone root cause.

## Guest placement and safe updates

Moving the existing Guest exit action into the Current status card is feasible
without changing its consent flow. This PR leaves its position and handler
unchanged so a layout move cannot be mistaken for a version-mismatch repair.

Keep the same Safari origin/tab and Guest session. Close Account to inspect the
existing update notice. Apply Update now only as an owner action after reviewing
unfinished work. Do not choose Update and discard drafts merely to diagnose this
issue. Ordinary refresh preserves LOCAL auth by design but may still load an old
SW shell. If a login choice appears, stop rather than create a replacement Guest.
Never clear website data, remove persistence, unregister a SW or sign out as a
version-recovery step. Copying a UID is not a recovery credential.

Old/current staging public Firebase settings fingerprints match, and the auth
service uses browserLocalPersistence. This does not prove that the phone's local
credentials are safely persisted. Authoritative Netlify environment-context
Firebase parity remains **not verified** in this investigation. No Firebase
configuration, credentials, users, records or Rules change is included.

The separate UTM behavior is confirmed: `isBootHomeEntry` accepts `/` only when
both search and hash are empty. This PR does not change Genesis routing policy,
the approved eight-second visuals, timing, Skip/Replay, preferences or protections.

## Validation and release boundary

Run the full existing suite, TypeScript, lint, default and simulated staging
builds, five Functions packaging, and synthetic mobile/desktop browser checks.
Use fake build SHAs and synthetic auth I/O in local browser fixtures; never use
real Google/Guest actions. The existing large-chunk advisory is separate from new
failures. No dependency or lockfile change is required.

This is a focused PR targeting staging. Netlify may generate its usual Preview
artifact, but real authentication acceptance belongs on the staging domain only
after a separately approved merge. No merge, staging promotion, Production
deployment or rollback is authorized by this investigation request. Previous
staging rollback reference remains `6af834fe833a0501f58ac2d5` / `f8cff23...`;
the current staging deployment is the baseline for this PR.

Sources:
- https://developer.chrome.com/docs/workbox/service-worker-lifecycle
- https://developer.chrome.com/docs/workbox/handling-service-worker-updates
- https://docs.netlify.com/build/configure-builds/environment-variables/
- https://firebase.google.com/docs/auth/web/auth-state-persistence
