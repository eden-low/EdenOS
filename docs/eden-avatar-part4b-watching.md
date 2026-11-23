# Part 4B batch 3 — Anime / Watching Eden

## Scope and behavior

Only Anime maps to `eden-watching`. Today/default blink/Capture, Treasurer,
Archivist, Reflector's native right-facing Review pose and About Smile/Think/Wave
are unchanged. Exercise and Cosmos remain default. Five appearances are available;
the other eight IDs stay planned without asset URLs. This is a **static prototype**,
without blink, gaze, yawn, click actions or simulated motion.

The original fixed right corner, 88×164 CSS frame, safe area and obstacle/occlusion
rules are reused. Watching's metadata `posture:'prone'` describes its illustration;
the existing animation machine remains `idle`, without a Capture sheet or perch.
Loading/error shows the genuine default sprite, and re-entry retries. The shared
loader clears callbacks and ignores stale decode completion on unmount.
No new visibility, input, fullscreen/player, Finance Lock or save logic is added.
Decoration remains aria-hidden, inert and pointer-events:none.

## Source board and transparent extraction

The only approved visual input is `EdenOS趴姿追番角色设计表.png`, **1536×1024 RGBA,
2,331,263 bytes**. Its mostly opaque board contains titles, preview cards, measurement
guides and detail panels; it is never used directly as a runtime image.
Source SHA-256:
`7599d68ee83f4d0f4f0a5ceeb2d748d9d046fe5b21c19ca685b5a71fd7033939`.

Extraction used the **built-in image editing tool**, with the board as the sole
edit target, to isolate the large left illustration and remove its background.
It is an edited derivative, not a pixel-exact rectangular crop or a newly approved
independent design. The output was inspected against the source, on light/dark
backgrounds, and later at actual size in the Anime page. Owner visual acceptance
is still required. No paid API/CLI image generation was invoked.

Retained: Eden's face/curls/glasses, black hoodie/wing insignia, gray cargo pants,
black sneakers, large headphones, prone pose, tablet, backpack/white cat keychain,
sleeping cat and cushion/plaid blanket. Removed: all board typography/cards/guides,
glow/floor/background, attention rays, optional popcorn, drink and book stack.
These optional props were omitted to keep the head, headphones and tablet legible.

The selected transparent extraction is **1407×1118 RGBA, 2,207,434 bytes**.
SHA-256: `5e34ed5a52337dc228027c028a4b6715c7e05d8c390c2fc3a0f892e8275796f5`.
It is saved in the local workspace at
`frontend/artifacts/browser-validation/watching/source-reference/watching-cutout.png` (ignored, not publicly
committed). The original board stays outside Git. Only the optimized WebP and
provenance JSON are published.

## Runtime resource and pose baseline

`eden-watching-prone-static.webp`: **352×656, 38,806 bytes**, transparent,
4× the **88×164 CSS px** frame. SHA-256:
`76aca599f54482003bf550555dbd124f7ab7ce023e1cedc394338f6b53e0c393`.

The cutout is uniformly downsampled to 336×267, then padded by 8px left/right/bottom
and 381px above. The complete wide prone pose is preserved, with intentional upper
transparency instead of stretching into a tall standing silhouette. The visible
scene is approximately 83×62 CSS px, resting near the frame's bottom edge.
The normalized bottom-center anchor refers to the tablet/cushion resting plane,
not the raised shoes. `object-fit:contain`, native left facing and frame dimensions
remain consistent with the existing renderer. There is no CSS pose transformation.

The encoder verifies both source and selected-cutout hashes; encoding is repeatable
from that selected extraction. Repeating generative extraction is not guaranteed
to reproduce the same pixels. Do not silently replace the selected cutout.

```powershell
# From frontend, using the original approved board and the selected local cutout.
node scripts/prepareWatchingAvatar.mjs 'path/to/EdenOS趴姿追番角色设计表.png' artifacts/browser-validation/watching/source-reference/watching-cutout.png
```

## Validation and release

Tests cover exact mappings/capabilities, image alpha/hash/frame/baseline, transparent
space above the pose, ratio preservation, loading/decode/display failures, stale
loads, unmount/retry and Reduced Motion. Actual-component browser fixtures use
synthetic identities/repositories with external data services blocked. They check
320/390/1440 widths, scroll/click-through, native/fallback Review direction,
lock invariance, routes/reload/history, focused inputs, Account/Genesis, short
viewport/landscape, Today Capture and About gestures. The real Anime player uses
only generated local media; opening/fullscreen hides Watching, and closing restores
the static prone illustration with `idle` state and no Capture perch.

Production-mode PWA checks all four static materials, including offline Anime cold
deep links/reload and posture. Release smoke compares actual deployed SHA/image
hashes, routes, manifest, worker/cache and missing-auth Function rejection. No real
finance/Review saves, Guest exit or paid service invocation is required or performed.

```powershell
# With local Vite on 5181; run shared fixture creation before route/PWA tests.
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
node scripts/aboutStagingValidation.mjs <full-ready-staging-sha>
```

Local checks passed: **190 Vitest files / 1,458 tests**, TypeScript, lint,
production build with **41 precache entries**, demo Firestore emulator rules and
all five Functions packages. Existing large-chunk build advisories remain.
All local browser/PWA checks above passed at three screen widths with zero runtime
exceptions, including actual player open/fullscreen/close restoration, default
fallback/retry for all static materials and 41 offline precached resources.
CI URL and matching Ready deploy ID are reported on delivery.
Firebase parity is **not verified**. Production, Firebase/Netlify sensitive config,
Firestore Rules, real user data and existing player/save/auth logic stay unchanged.
Rollback reference: SHA `0a93906dead4b436f170b24a6964ba1a75bdf0d5`, Ready deployment
`6b00ab8f582ec1aec2926813`. No automatic rollback is performed.

## Owner acceptance and stop boundary

On iPhone Safari, installed PWA and desktop, inspect Anime's small resting pose:
identity, glasses/wing, tablet/headphones, backpack/keychain, cat, complete shoes,
clean alpha edges and intended top transparency. Check continuous scroll and touch
through, lock/PIN/modal/Genesis, player open/close/fullscreen, keyboard/landscape and
safe area. Recheck refresh/deep links/history/offline loads, Today Capture and all
previous outfits/About gestures. Synthetic Chrome checks are not real Safari/PWA
acceptance. Stop after this staging batch; no Exercise, Cosmos, Part 5 or Production.

## Exact extraction prompt (built-in tool, transparent background enabled)

```text
Use case: background-extraction. EDIT TARGET: the provided approved Watching Eden presentation board. Extract ONLY the large main illustration at the LEFT of the board (roughly x=20..835, y=45..625 in the 1536x1024 image), into one genuine transparent-background runtime cutout. Keep the exact original illustration, character face, curly hair, black glasses, black hoodie and white/blue EdenOS wing emblems, large headphones, hands propping cheeks, naturally prone body and bent-up legs with light gray cargo pants and black sneakers. Preserve the tablet in front, backpack with white cat keychain at the left, the small sleeping cat at the lower right, and the soft cushion/plaid blanket beneath the body. Preserve these exact identities, proportions, pose, linework, colors, and original native facing; DO NOT redraw/reinterpret/repose/mirror the character, invent hands, stretch the body, or change any logos. Remove the background gradient, floor, ambient glow, attention rays, ALL text/headings/panels/cards/measurement guides, center and right miniature previews, and bottom detail cards. For small-size clarity, omit optional popcorn, cup/drink and stack of books, keeping all required character and tablet/headphone/backpack/cat details. Do not erase or crop any required detail when removing those optional props. No captions, frame, white card, baked checkerboard, shadow rectangle, ground plane or board elements. Output a clean high-resolution tightly bounded transparent cutout with a small transparent margin, ready for uniform contain rendering in an 88x164 CSS frame. This is extraction from the approved left artwork, not a new character design.
```
