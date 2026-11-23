# Part 4B batch 1 — Records / Archivist Eden

## Scope and runtime

Only Records maps to `eden-archivist`. Expenses retains Treasurer; Today retains
the original blink and Capture perch/return. Other modules retain the original
character, including Review's lower-left inward-facing pose. About's independent
Smile/Think/Wave v2 is untouched. The remaining ten planned IDs have no URLs.

The existing `AvatarAppearance` loader handles preload, decode, displayed-image
errors and default fallback. It clears handlers and ignores stale completion on
unmount; re-entry retries. No new renderer, motion timer or data listener is added.
The shared placement, Capture collision checks, viewport/safe area, focus/keyboard,
modal/PIN/Genesis/fullscreen protection and Finance Lock independence are unchanged.
Decoration remains inert, aria-hidden and pointer-events:none.

This is a **static prototype**: no blinking, clipboard reading, page turning or
nodding is claimed or simulated. Further motion requires dedicated approved art.

## Approved inputs and derivative

Both supplied PNGs were fully decoded and have alpha:

| Input | Dimensions | Bytes | Use |
| --- | --- | --- | --- |
| `Part4B_Archivist_Eden_visual_draft.png` | 380×630 | 372,144 | Only production pixel source |
| `Part4B_Archivist_Eden_88x164_preview.png` | 88×164 | 25,152 | Comparison only; never enlarged |

The PNG originals remain outside Git. Draft SHA-256:
`ac632b474484cbdc7e2180530d5d7c681f109e7611fda83e122ceb999ccda47d`.
Preview SHA-256:
`42032713d7315194b78b78ffbba06c26fb5d4237f7f4cbfed2ff5854dd0953ff`.

`eden-archivist-clipboard-static.webp`: **264×492, 48,890 bytes**, transparent,
3× the **88×164 CSS** frame. SHA-256:
`75bef2ce7bfcd3e0175e7f7c5f367541084e45df391ac90ca0baefc9f88ebf83`.
Its sidecar JSON records all provenance and capabilities. The generator accepts
only the approved draft hash, crops the complete nonzero-alpha bounds
(x=74..339, y=7..629), and uniformly downsamples into a centered transparent frame.
No nontransparent source pixels are removed. Head/foot placement matches the
approved small preview, with bottom-center anchor and `object-fit:contain`.
The supplied draft's feet already reach its bottom edge; no missing art is invented.

```powershell
# From frontend; no API or image generation is used.
node scripts/prepareArchivistAvatar.mjs 'path/to/Part4B_Archivist_Eden_visual_draft.png'
```

## Validation and release

Focused tests cover exact role mapping/capabilities, transparent resource integrity,
proportions, visible bounds, loading/decode/display failures, stale loads, route
cleanup and Reduced Motion. Browser tests use actual pages/components with isolated
synthetic identities/repositories: all routes/corners, long scroll and click-through,
lock invariance, Capture/modal hiding, navigation/reload/history, About gestures,
Review inputs, Cosmos local controls and a synthetic-media Anime player.

The production-mode PWA test verifies both static outfits are precached and decoded
offline, including cold Records deep links/reload. Release smoke compares deployed
asset hashes, SHA, manifest, service worker and unauthenticated safety boundaries.
Local validation passed: **188 Vitest files / 1,438 tests**, TypeScript, lint,
production build (39 precache entries), Firestore demo emulator rules tests and
all five Functions packages. Existing large-chunk build advisories remain.
Browser regressions passed at 320/390/1440 widths, safe-area/landscape/short viewport,
About keyboard/200% text/gestures and original Today Capture; both static materials
passed failure/retry and offline decode with zero browser runtime exceptions.
CI URL and the matching Ready deployment are recorded in the delivery report.

Reproduce from `frontend/` with Vite on port 5181:

```powershell
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# After staging is Ready:
node scripts/aboutStagingValidation.mjs <full-staging-sha>
```

Rollback reference: `1a5717ec7c9eecbfed67b366ac839e740823c87c`, Ready deployment
`6b009d968b5f1199a12d6ea3`. No automatic rollback is performed.
Firebase parity is **not verified**. No Firebase/Netlify sensitive configuration,
Production, actual user records or paid APIs are changed or invoked.

## Owner visual acceptance and handoff

At `/records`, check iPhone Safari, installed PWA and desktop: curls/glasses/wing,
clipboard lines, backpack/cat, pants/shoes, 88×164 readability, head/foot anchor,
safe areas, scrolling and touch-through. Check lock toggles and actual PIN/modal,
keyboard/landscape, offline refresh, deep links/history and page leave/return.
Recheck Today Capture, Expenses Treasurer and About's three gestures. No real
record/financial/reflection saves or Guest sign-out are needed for this review.

Stop after this batch's staging delivery. Review/Anime outfits, all new idle frames,
Exercise dual forms, Cosmos six forms, Part 4E and Part 5 remain unimplemented.
Future metadata/selection extensions follow the interfaces in the Part 4 plan.
