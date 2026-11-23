# Part 4D — Cosmos six static forms and shared system selection

## Scope and explicit completion boundary

Six static outfits are ready: Tarot, I Ching, BaZi, Astrology, Zi Wei and AI Explorer.
All 13 registered IDs now have actual art: the accepted original sprite plus twelve
static prototypes. This does **not** complete Part 4's dedicated idle/action frames.
No card flip, coin toss, scroll opening, star-chart rotation, Zi Wei effect,
hologram tap or new blink is simulated by transforming still images.

Today blink/Capture, Treasurer, Archivist, Reflector's left corner/facing, Watching
and player occlusion, Exercise entry parity and About's three gestures are preserved.
No Part 4E, Part 5/6, financial/workout events or Production work is started.

## One canonical selection shared with the avatar

`cosmosSelection.ts` owns the one typed `CosmosExperience` snapshot and a setter
with the original React `Dispatch<SetStateAction<...>>` semantics. Both the real
page and avatar subscribe via `useSyncExternalStore`. There is no DOM tab query,
effect-based mirror state, result-dependent choice, counter or random rotation.

`CosmosSelectionProvider` scopes a fresh store to Cosmos visit activation. The
initial snapshot is Tarot before either consumer renders. Tab changes retain that
same store and page component instance. Leaving/returning changes the scope, so
both the actual page and requested character start Tarot, without stale AI/Zi Wei
pixels from the previous visit. Native reload also starts Tarot, as the original
page's local state did. No Cosmos choice is written to local/session storage.

`CosmosPageContent` replaces only its local experience useState with the shared
hook. All calculation inputs, shuffled deck, readings, errors and snapshots stay
in their existing owners. Existing click/arrow/Home/End handlers and Ask Cosmos
`onOpenSystem={setExperience}` use the same setter. No page key/remount is added
for changing clothes. `CosmosSelectionBoundary` creates a store only for standalone
page renders without a global scope; it inherits the existing scope in the app.

| Actual selection | Avatar |
| --- | --- |
| `tarot` | `eden-tarot` |
| `iching` | `eden-iching` |
| `bazi` | `eden-bazi` |
| `astrology` | `eden-astrology` |
| `ziwei` | `eden-ziwei` |
| `ai` | `eden-ai-explorer` |

## Verified approved source identities

The six supplied files were visually inspected individually and composited on a
light background for alpha/edge inspection. Every source fully decodes as
**1024×1536 RGBA**. The standardized filenames below identify actual visual content,
not guesses from the auto-download filenames. Original files remain unchanged.

| Canonical source | Supplied suffix/order | Visual verification | Source SHA-256 |
| --- | --- | --- | --- |
| `eden-tarot-source.png` | `06_36_36-1` | Purple/gold star cloak, star brooch, Tarot card | `2d93cfc7908634d2038a2208a8c49e1fab87940763c880a3b19c25de5382f4ac` |
| `eden-iching-source.png` | `06_36_38-2` | Green/ivory robe, yin-yang/jade, three square-hole coins | `e9a9f418aee8f7ca3df170aa822c3a93c8f14d6c10938bffe9276c8647a5b22e` |
| `eden-bazi-source.png` | `06_36_39-3` | Navy scholar clothing, brush and calendar scroll | `9979837b82bb03252d653c2769d509fd352fb8ec5157ea17bf957eae017b246e` |
| `eden-astrology-source.png` | `06_36_40-4` | Silver/blue observer coat, telescope and astronomical chart | `d0b5284ac28446d99d8a7455b73199cf4f006d1d2ea30feaa05bb5a5d9445976` |
| `eden-ziwei-source.png` | `06_36_42-5` | Ornate purple/gold star officer, jade/chart/ribbons | `e358a95a779cf68556f43c82c2dca7f2de3a9fa560bc4075aeb8f31d006b3d4e` |
| `eden-ai-explorer-source.png` | `06_36_43-6` | Black/ice-blue technology coat and hologram | `79738508213cbcd1db5ff268998c63e3f6aa913d39f93087c210c5c632f5efb5` |

Full supplied names follow `ChatGPT 图像 2026年11月21日 <suffix>.png`; sidecars record
those names, original bytes/dimensions and hashes. Canonical copies are retained
locally in ignored `frontend/artifacts/browser-validation/cosmos/source-reference/`.
No original PNG is published. No replacement art, generation or paid API is used.

## Runtime resources and alignment

All resources are transparent **352×656** WebP, rendered at **88×164 CSS px**.

| Runtime file | Bytes | SHA-256 |
| --- | --- | --- |
| `eden-tarot-static.webp` | 90,404 | `d0ab2c6ba0bf20d08eb691d684afb035fb662abe1db54a472d0ee6703317220d` |
| `eden-iching-static.webp` | 86,192 | `5fc3c0f31457a15e31e96920a0242101ae2c34501dae120888da3efa429b0c5d` |
| `eden-bazi-static.webp` | 88,446 | `21adfcdbb34d51802bc807664e246f20f3f2dc1e9d4654393069f9c36b834704` |
| `eden-astrology-static.webp` | 80,058 | `8ab0c4c29e067d91885cedf817e6d8e08170f8390335e6290245647629b4c57b` |
| `eden-ziwei-static.webp` | 104,630 | `1422e06490ee8df5a9ce669518b893d4e0a9c69669c223e0789ded1aec9813d0` |
| `eden-ai-explorer-static.webp` | 68,946 | `b57cb48b7c2839bd61b10b72b1e15bc928b3e4c5d3a257812d1a6e45cc90a30a` |

Total new compressed art: **518,676 bytes**. The deterministic encoder validates
each visually established source hash/order. It clears only near-invisible alpha
1–3/255 export speckles, crops common transparent side margins at (24,0,987,1536),
asserts every remaining nontransparent pixel is retained, adds 8px clearance and
uniformly contains/bottom-aligns the whole result. Native orientations, faces,
hands, cards/coins/scrolls, charts, ribbons, hologram, bags/cats and shoes are kept.
No stretching, mirroring or drawing edits occur.

The original wide props/cloaks limit the visible full-body height to roughly
134–136 CSS px within the 88×164 frame, leaving intentional top clearance. This
preserves face scale consistently across all six rather than enlarging the layer
or cutting required props. Phone-size screenshots were inspected for complete
silhouettes; tiny card/scroll markings still need owner device acceptance.

```powershell
# From frontend; arguments must match verified identity order and source hashes.
node scripts/prepareCosmosAvatars.mjs <tarot.png> <iching.png> <bazi.png> <astrology.png> <ziwei.png> <ai-explorer.png>
```

## Loading, safety and offline behavior

The registry stores URLs/metadata, not decoded images. Only the selected appearance
instantiates its image loader; initial Cosmos browser checks observe Tarot image
requests only. Switching IDs keys the existing loader: cleanup clears handlers and
an active guard ignores stale decode completion. While loading/error, the actual
original sprite is the safe placeholder, never another system's old outfit.

Failed static resources now retry on an `online` event, without changing selection
or remounting the page. The private retry attempt belongs only to the image loader;
it cannot advance Exercise entries, submit forms or call Gemini. Listener cleanup
occurs on recovery/unmount. Reduced Motion remains static; no new transition is
required. The existing inert/aria-hidden/pointer-events:none decoration, fixed
right corner, safe areas and priority occlusion remain unchanged.

PWA precaches the six compressed resources under a narrow filename pattern, not
six decoded high-resolution images. Manifest/start URL, update mechanism and Auth
boundaries stay unchanged. Cached forms decode after offline cold routes/reloads.

## Validation, release and acceptance

Local checks passed: **195 Vitest files / 1,558 tests**, TypeScript, lint without
new warnings, production build with **49 precache entries**, demo Firestore rules
and all five Functions packages. Existing large-chunk build advisories remain.

Focused unit/browser coverage includes all mapping paths, keyboard/Ask internal
jumps, arbitrary/rapid selection, late images, all six resource failures/recovery,
Tarot input/node/result preservation, selected-only initial loading, route re-entry,
Exercise independence and actual local Tarot/I Ching/BaZi/Astrology/Zi Wei engines.
Synthetic dates/identities and read-only repositories are used; generation buttons
for paid services are never invoked. No real user records or dangerous Guest
actions are needed or performed. Safari/PWA device acceptance is still manual.

```powershell
# Prepare reference files before starting Vite on 5181. Run fixture dependencies first.
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/cosmosAvatarBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
node scripts/aboutStagingValidation.mjs <full-ready-staging-sha>
```

All six browser suites passed: About, Today/Capture, eight-route navigation,
Cosmos systems, Exercise entry parity and offline PWA. The route suite's initial
parallel run timed out waiting for a Today Capture anchor after closing Anime;
the full serial rerun passed that path and all routes with no runtime errors.
Exact final CI/deploy results are in delivery. One local Vite watcher
stopped with Windows EBUSY while new reference PNGs were copied; QA was restarted
with generated artifact directories excluded from watching, without changing the
tracked development/release configuration. Reference preparation precedes normal
Vite startup when reproducing these checks.

Rollback reference: SHA `3b5ddf76f2e6cf82d04aaffc362b9adf34de4883`, Ready deployment
`6b00bf9e879fb38200ec9148`. No automatic rollback is performed.
Firebase parity is **not verified**. Production, Firebase/Netlify sensitive config,
Rules, Auth/Guest and actual financial/workout data remain unchanged.

On iPhone Safari, installed PWA and desktop, inspect all six identities, face/wing
and props at 88×164; keyboard and Ask internal links; rapid switches, error/online
recovery without input reset; long scrolling/click-through; lock/PIN/Genesis,
fullscreen/keyboard/landscape/safe areas; deep links/reload/history, PWA update and
offline Auth protection. Recheck Today Capture, Exercise parity, previous outfits
and About gestures. Stop after 4D static delivery; dedicated action frames and
Part 4E/5/6 await separate work and approval.
