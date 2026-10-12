# Cosmos Phase 1A — Tarot implementation and handoff

## Repository findings

- React 19, TypeScript 6, Vite 8, Tailwind 4; Radix dialogs and a shared Button.
- Custom History API routing, including legacy hash routes; Cosmos adds `/cosmos`.
- Desktop uses one left sidebar; mobile uses one app drawer and a fixed Capture
  button. Cosmos extends the shared destination list without adding a bottom bar.
- Today is a record-derived dashboard. Its cards and Capture implementation were
  not edited.
- Light/dark/system theme is managed on the document root. Cosmos scopes its
  black-and-gold palette to its page, while the application shell retains the
  selected theme. Typography, spacing, rounded surfaces, and controls reuse the
  existing conventions.
- The working tree was clean before implementation. `main`, `origin/main`, and
  `origin/staging` were all `aa469587ac494bc69c5d972c172e18de43660f18` after fetching.
  Work is isolated on `feature/cosmos-tarot-phase-1a`.

## Implementation

- `src/cosmos/tarotDeck.ts`: 78 cards, Chinese and English names, 22 Major and
  four 14-card Minor suits, individual upright/reversed interpretations.
- `src/cosmos/drawTarotCard.ts`: browser `crypto.getRandomValues` with rejection
  sampling to avoid modulo bias; independent card and orientation selection.
  Sampling a single card uniformly is equivalent to shuffling and drawing the
  first card. Each draw returns to the full deck; repeats are possible.
- `src/cosmos/TarotCardVisual.tsx`: original card-back SVG and typographic face.
- `src/pages/CosmosPage.tsx` and `cosmos.css`: initial empty state, reveal, repeat
  draw, retryable error, cultural/entertainment/reflection disclaimer. Selection
  is synchronous, so no artificial loading delay is introduced. Route loading
  uses the existing application Suspense fallback.
- `App.tsx`, `routing/appRoutes.ts`, `components/layout/Navigation.tsx`, and
  `domain/command.ts`: lazy page, clean/hash routes, sidebar/drawer and commands.
- Tests accompany deck, selection, page, routing, navigation, and commands.

No dependencies, AI calls, storage writes, database/schema changes, credentials,
or environment changes are introduced. Readings reset when leaving the page.

## Source review

No third-party dataset or artwork is imported. Chinese interpretations and the
SVG geometry were authored for EdenOS from traditional symbolic themes.

- [smallcat419/tarot-card-data](https://github.com/smallcat419/tarot-card-data):
  fetched JSON was checked: 78 unique IDs, 22 explicit Major records, 56 Minor
  records with suits but no `arcana` field, and upright/reversed meanings for all
  records. README/metadata declare CC0 1.0; no standalone repository license file
  was available. English copy requires localization and schema normalization.
- [StarTarotOnline/tarot-rws-dataset](https://github.com/StarTarotOnline/tarot-rws-dataset):
  repository documents 78 English historical records, and its license file is
  identified as CC BY 4.0. It was reviewed as an alternative; its historical
  wording is not bundled in this implementation.

All 78 local entries are implemented. A subject-matter editorial review of the
concise Chinese meanings is suggested before any future production promotion.

## Validation

- Baseline: 113 test files, 705 tests passed.
- Implementation: 116 test files, 714 tests passed.
- `npm --prefix frontend run lint`: passed.
- `npm --prefix frontend run build`: passed, including `tsc -b`, Vite, and PWA
  generation. Cosmos is a separate lazy chunk (approximately 7.4 KB gzip plus
  0.9 KB CSS gzip).
- `git diff --check`: passed.
- Existing Anime tests emit React `act` warnings; existing failure-path tests
  intentionally log simulated errors. Existing large main/HLS bundle warnings
  remain. No test failures were observed.

## Staging status

Deployment is pending verified staging configuration. The repository contains
`origin/staging` and generic Netlify build configuration, but `netlify.toml` does
not specify the site, production branch, or staging branch mapping. GitHub has
no registered deployments or environments identifying a staging target, and no
usable Netlify CLI session or browser is available in this session.

The known GitHub Firestore rules workflow targets `main` and project
`edenos-e1bbb`; it is not a staging frontend deployment workflow and must not be
used for this feature. No branches have been pushed or merged and no deployment
has been triggered. Before deploying, verify the existing Netlify site and its
production/staging branch mapping, then follow that site's existing workflow.

## Mobile and visual review checklist (pending)

- iPhone Safari, portrait and landscape: drawer opens, Cosmos navigates, one
  Capture button remains, and Capture still opens its original sheet.
- At 320/375/390 px widths: no horizontal overflow; card, text, draw button,
  disclaimer, and bottom safe area remain readable and reachable.
- Repeated taps: results update, both orientations appear, and no quota appears.
- Keyboard and VoiceOver: navigation and draw control have visible focus;
  result updates are announced; decorative artwork is ignored.
- Light/dark/system modes: Cosmos remains black-and-gold; returning to Today
  preserves the selected application theme.
- Reduced motion: no card animation and no button transition.
- Desktop: sidebar navigation, card/result columns, browser Back, direct
  `/cosmos` refresh, and legacy `/#/cosmos` entry all work on staging.

The browser runtime was unavailable, so no device or screenshot review is claimed.
Phase 1A ends here; evaluate the staging experience before proposing more Cosmos
features.
