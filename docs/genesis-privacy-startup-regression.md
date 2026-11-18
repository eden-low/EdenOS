# Genesis Boot × Privacy Lock startup regression

## Cause and change

When the restored authentication tree mounted, `GenesisBoot` reported its existing
`privacy.locked` state as a launch interruption. `GenesisLaunchSession.reportBlocked(true)`
then dismissed the already-running startup visual, often about one second after launch.

Startup now distinguishes the initial device lock from a later lock transition.
The initial lock continues masking money while the decorative sequence finishes.
After the first unlocked state, a later locked state still interrupts before paint.
Errors, drafts and updates remain unconditional interruptions. Explicit `lock()`,
`requestUnlock()` and `unlock()` dismiss startup immediately, including programmatic
calls while the device is already locked. PIN verification is never postponed.

`GenesisBootProvider` still receives `privacy.locked` as a blocker for automatic
post-auth welcomes and manual Replay. The eight-second sequence, Skip, reduced
motion, preference storage, launch eligibility and session state machine are unchanged.
The existing privacy-priority test now mounts an unlocked workspace before testing
a runtime lock transition, rather than conflating restoration with that transition.

Runtime files: `GenesisBoot.tsx`, `genesisLaunchContext.ts`, `PrivacyLockProvider.tsx`.
Regression files: `GenesisPrivacyStartup.test.tsx`, `GenesisLaunchProvider.test.tsx`,
`scripts/verifyGenesisPrivacyBrowser.mjs`.

## Verification

Base: staging `175073cc0bc8287f57ee2bf2ccd9b31f6f3c3a84`.
Tests were committed first as `671a281` and run before any runtime change:

```text
npx --no-install vitest run src/boot/GenesisPrivacyStartup.test.tsx --reporter=verbose
13 failed | 1 passed
```

The disabled-lock eight-second control passed. Restored synthetic Google and Guest
identities dismissed the overlay at the one-second restoration point; an already
restored locked tree also prevented the first frame. The remaining locked-flow
tests failed at their animation-visible prerequisite.

Final local checks:

- TypeScript (`tsc -b`): passed.
- Lint (`oxlint`): passed without warnings.
- Vitest: 174 files, 1328 tests passed, including 14 new integrated cases.
- Build: passed; existing bundle-size advisory remains. Service worker and manifest generated.
- Firestore Emulator: existing rules suite passed using `demo-edenos-rules`; no live Firebase operation.
- All five Functions packaged with esbuild using the existing external-module setting; no function invoked.
- Chrome synthetic browser: 32 scenarios passed across 390×844 and 1440×960.
  Lock off/on, restored Guest/Google, eight-second stages, underlying amount masking,
  locked Replay restriction, Skip, programmatic unlock, incorrect/correct real PBKDF2
  PIN, explicit lock, data/auth errors, PWA update, pagehide/navigation, resume,
  deep link, reload, reduced motion and disabled preference were checked.
  Zero authentication calls, plaintext leaks while locked, unexpected requests or browser errors.

Run the browser regression after building:

```text
node scripts/verifyGenesisPrivacyBrowser.mjs
```

It uses an installed Playwright module; alternatively set
`EDENOS_AUDIT_PLAYWRIGHT_MODULE` to its `index.mjs`. An installed Chrome can be used
with `EDENOS_AUDIT_BROWSER_CHANNEL=chrome`. No dependency or configuration is added.
The fixture bundles the actual UI and CSS but replaces Firebase initialization,
authentication service, record subscriptions and settings subscriptions with synthetic
implementations. All requests outside its synthetic document are blocked.
Local reports/screenshots are under the ignored `frontend/artifacts/browser-validation/genesis-privacy/`.

## Release boundary and remaining acceptance

This change is a PR to `staging` only. No merge or deployment is authorized.
Read-only preflight on 2026-11-18 confirmed:

- Staging deploy `6afc7d9427a033316f198445`: Ready at the base SHA above.
- Production deploy `6afc83496225fca7bdfb8575`: Ready at
  `08fd41e11c053bb2dad6ac55375437ed35e76656`.
- Firebase parity: verified for all six Vite Firebase Web configuration values
  between Netlify production and branch-deploy contexts; no branch-specific override
  was present. Values and credentials were not printed or changed.
- Requested repository `AGENTS.md` and `.agents/skills/edenos-staging-first/SKILL.md`
  were absent in both the initial checkout and latest staging. The installed global
  `edenos-staging-first` skill and its Firebase safety reference were read and followed.

After Owner approves and a separate authorized staging merge is complete, verify at
`https://staging--edenos.netlify.app` on a real iPhone Safari and installed PWA:

1. Fresh home launches with Privacy Lock disabled and enabled; enabled launch runs
   the full eight seconds without a flash of financial values.
2. Completion and Skip preserve locked state; incorrect PIN fails and correct PIN unlocks.
3. Active Unlock, update/error handling and background/security interruption yield promptly.
4. Resume, ordinary navigation, deep links and reload do not start another eight seconds.
5. Reduced Motion, Replay restrictions, preferences and safe-area Skip remain usable.
6. Restore disposable Guest and Google sessions manually without changing valuable records;
   confirm auth/account safety using the established staging acceptance workflow.

Synthetic navigation/standalone signals cannot establish actual iOS process lifecycle
behavior. Real-device acceptance is outstanding. Production release requires separate
authorization after staging acceptance. No Firebase configuration, Rules, Netlify
configuration, credentials or real user data changed. Since nothing was merged,
rollback is closing the PR; deployed branches remain at the recorded references.
