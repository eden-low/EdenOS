# Production stability small-bug audit

Baseline: staging `8e32c7f9daf45b262e7ea8dbf693205db982945a`; main
`caa71c24c2346743817d0f8fde73afc9110b5ac3`. Their source trees match.
The audit and synthetic tests run in an isolated checkout. No live account,
Firestore, paid API, environment or deployment mutation is part of this work.

## Confirmed bugs and minimal fixes

### PWA draft-warning state

The draft warning was a lifetime Boolean. Confirming/removing the drafts left a
misleading discard warning, and replacing them reused the previous warning
stage. The warning now corresponds to the current pending draft IDs. Replacement
drafts require a fresh warning step; clearing/confirming all drafts removes the
discard label. This changes no draft contents or persistence operations. A
pending attempt remains disabled even while the draft set changes.

Reproduction: the selected seven tests in `PwaUpdatePrompt.test.tsx` produced
two failures against the baseline component (replacement and cleared drafts).
All seven pass with the fix. No real SW is activated in
these tests, and no draft is actually discarded by the test harness.

### Drawer positioning, scrolling and safe areas

The drawer inherited the shared `sm:` centered-dialog positioning, which moved
the side drawer away from the left edge on phone landscape widths. It also had
no vertical scroll container, and its heading/close control did not account for
reported top or side safe areas. On short viewports the final action could not
be reached above the bottom safe area.

Centered responsive classes now apply to the existing non-drawer variants only.
The drawer gains its own scroll container and safe-area padding/control offsets.
Account, Capture, confirmation and player variants retain their prior positioning
classes and close-control offsets. No navigation, authentication, Privacy Lock
verification or event-handler logic changes.

Reproduction: actual baseline navigation/Account components with the published
CSS produced 30 failures in 126 checks across 15 portrait/landscape/safe-area
scenarios. After the fix, the expanded browser suite passes 180 assertions across
21 scenarios, including narrow/short viewports and desktop controls. It exercises
the real components and compiled CSS with synthetic account contexts, cancels PIN
editing without saving, and rejects unexpected network requests. Reported safe
areas are substituted into the isolated CSS; a shortened viewport is not a real
iPhone software keyboard.

## No issue under the existing approved design

- Genesis deliberately accepts only canonical `/` with no query or fragment.
  `utm_source` therefore suppresses automatic playback, as do authentication-like
  parameters and deep links. No URL is rewritten. Seven added cases preserve
  this conservative policy; no tracking whitelist or auth callback change is made.
- `Later` hides the prompt for the current PWA Provider lifetime, as documented in
  the existing version investigation. This policy and SW registration/activation
  behavior are unchanged. After update dispatch, controls remain locked pending
  reload; rejection restores the existing retry controls. The helper's fulfilled
  Promise is not a reload-completion signal. Multi-cycle prompt state could be forced through a
  synthetic context, but was not established as a current Provider production
  path and is not used as a reason for a lifecycle rewrite.
- Local date refresh already schedules noon/evening/midnight boundaries and
  catches up on visibility restoration. Four added tests cover these boundaries,
  year rollover/background suspension and timer cleanup. Date, refresh and route
  tests pass 22 cases each in UTC, Asia/Kuala_Lumpur and America/New_York.
- Existing tests cover canonical/hash navigation, subscription retry, scoped
  loading/error states, failed draft persistence and rejecting offline writes.
  These mechanisms and Guest UID/account guards are not changed.

## Potential issues / verification limits: no speculative fixes

- Native iPhone keyboard resizing, browser chrome, touch overscroll and the
  interaction between Safari's back gesture and the app's edge gesture need
  physical-device evidence. The browser suite does not establish iOS behavior.
- Cold/offline navigation to a never-cached lazy chunk and rapid SW replacement
  are not established by these synthetic tests. No generic import-retry system,
  automatic reload, cache clearing or new SW polling is introduced.
- A stale/no-op SW update that resolves but never reloads could leave the existing
  busy state active. This can be forced with a substitute helper, but has not been
  established through the real registration/controller flow. Releasing controls
  on dispatch completion would also change normal activation behavior, so that
  recovery policy is deliberately left unchanged pending stronger evidence.
- Runtime device timezone changes without reload and DST ambiguous-time policy
  are not exhaustively verified by the three-zone calendar test run.

## Validation and review boundary

- Baseline full Vitest: 1,296 tests / 171 files pass.
- Final full Vitest: 1,314 tests / 173 files pass.
- TypeScript, lint, Production-context build and all five Functions packages pass.
  The pre-existing large-chunk build advisory remains; dependencies are unchanged.
- Production-context output emits no Staging build metadata. No Genesis runtime
  code/CSS, Firebase Auth, Rules, credentials or backend implementation changes.

To repeat the browser suite, run `npm run build` in `frontend`, then
`node scripts/verifyStabilityBrowser.mjs`. If Playwright is installed outside this
checkout, set `EDENOS_AUDIT_PLAYWRIGHT_MODULE` to its absolute `index.mjs` path.
An optional first argument selects a CSS file for baseline comparison. The runner
uses the existing `tsx` dependency's bundler; no project dependency is added.

The PR targets **staging for review only**. Do not merge or deploy without the
Owner's approval of that concrete PR. Production requires successful approved
Staging validation followed by separate approval of a specific Release PR.
