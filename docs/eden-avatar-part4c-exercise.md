# Part 4C — Exercise static Swim / Boxing and deterministic entry parity

## Scope

Exercise alone alternates `eden-swim` / `eden-boxing`. Both are static ready
resources. Seven appearances are available; the six Cosmos IDs stay planned without
URLs. Today/blink/Capture, Treasurer, Archivist, Reflector's left corner/native
right facing, Watching/player protection and About gestures stay unchanged.
No Exercise logging/upload/save logic, financial events or domain records are read
or changed. No Part 4D, Part 5 or other performance is implemented.

**Static prototype complete; dedicated idle animations are not complete.** There
are no goggles adjustments, shoulder motion, punches, glove swings or new blinks.
No CSS transform or repeated still frames impersonate those animations.

## Approved resources

Both files are the exact approved **1024×1536 RGBA** PNGs. Downloads assigned auto
filenames, so identity was established by the owner's SHA-256 rather than filenames.
Light/dark alpha inspection confirms clean standalone transparent characters;
the RGB data behind fully transparent pixels is not a visible background.

| Role | Logical approved source | Source bytes | Source SHA-256 |
| --- | --- | --- | --- |
| Swim | `泳池训练少年与猫咪装备.png` | 1,981,910 | `8a2f2b298c44ae37d0a3fbe86ecf8e4f09d1a160e898e4ff30c2c21a652530f5` |
| Boxing | `炫彩拳击少年伊甸.png` | 1,922,407 | `f01340383fe59707c967627c45d953b7279453f3b55bac5318dfdf911b6f6863` |

| Runtime WebP | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `eden-swim-static.webp` | 352×656 | 80,290 | `64ef6e966198d48578670a6064b4f0d74f825718d48ed446422ad31ecbd8dbaa` |
| `eden-boxing-static.webp` | 352×656 | 71,196 | `145c988a21f9f9edfe6b815fb9eafdb45f3e2fb394c6bb48d0024734bdf406b8` |

The entire character, goggles/headband, hands/gloves, shoes/sandals, fins/bottle,
towel, bags/keychain and wings are retained. Only near-invisible alpha 1–3/255
speckles are cleared. Both images then use the same source crop (83,23,833,1468),
which includes their combined alpha>=4 bounds plus clearance. The encoder asserts
that no remaining nontransparent pixels lie outside that crop. Uniform contain
scaling, bottom alignment and a bottom-center frame anchor keep the full bags
within **88×164 CSS px**, without widening the occupied area or stretching bodies.
Head bounds are approximately 10–11 CSS px from the frame top, and feet near 163px,
consistent between both forms. Bag width limits how much further they can enlarge.
Native directions are preserved; only Review uses its existing facing policy.

Original PNGs remain outside Git. The repo contains optimized WebPs, provenance
JSON and a deterministic hash-checked encoder; no image generation/API is used.

```powershell
# From frontend, passing the approved files (their local names may differ).
node scripts/prepareExerciseAvatars.mjs 'path/to/swim.png' 'path/to/boxing.png'
```

## Entry lifecycle and duplicate prevention

`createExerciseAvatarEntries` is a small document-lifetime controller, separate
from image rendering, animation state and data providers. `useExerciseAvatarEntry`
reads a pure snapshot via `useSyncExternalStore` and observes the committed page
in a layout effect. It never updates parity during render or snapshot reads.
An unchanged page is idempotent. Strict Mode replay, rerenders and provider/root
remounts in the same document keep the same form. Going to another committed page
and back advances exactly once; back/forward uses the existing URL-backed router.
The hook returns no stale form between route render and commit.

On entry, sessionStorage key **`edenos:exercise-avatar:v1`** holds only
`{version:1, owner, next}`. `next` flips between Swim and Boxing rather than an
ever-growing counter: Swim → Boxing → Swim indefinitely. The document retains its
current selection until a real leave/return. A new document on refresh/direct
navigation reads the next value and advances once. Image preload/decode/error and
retry cannot consume an entry. The existing keyed loader cancels old callbacks
and ignores late completion when switching outfits.

Malformed/unsupported data selects Swim and repairs the next value. Storage
access/read/write failures select Swim for the entry. No localStorage, Firebase,
Auth identity, workout type/history, random form choice or timer participates.

### New tabs and restored documents

Browser sessionStorage can initially be copied from an opener; separate storage
alone is therefore insufficient for first-entry Swim. A non-sensitive
`[edenos-exercise-tab:<timeOrigin>]` suffix in `window.name` distinguishes the tab
from a fresh child context and survives same-tab reload. Existing names are
preserved; the timestamp is only a tab marker, never a selection input or user ID.
A copied record with a different owner starts Swim and affects only the child.
No cross-tab messaging or permanent cross-tab history is installed.

References: [sessionStorage lifecycle/opener copy](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage),
[browsing-context name](https://developer.mozilla.org/en-US/docs/Web/API/Window/name).

BFCache retains the controller in its existing document. Duplicate pageshow,
popstate/hashchange, visibility/focus or freeze/resume notifications at the same
page do not advance it. True SPA page transitions do. A non-BFCache history load
creates a new document and consumes its genuine Exercise entry normally. Actual
Safari/PWA restoration and browser-specific tab duplication remain manual checks.

## Safety and validation

The global avatar retains right-corner placement, aria-hidden, inert and
pointer-events:none. Ordinary scrolling/buttons do not hide it. Lock state alone
does not affect it; PIN/modal, Genesis, focused inputs, keyboard, fullscreen,
landscape/insufficient viewport protection remains the shared existing behavior.
Resource failures use the original safe sprite without consuming another entry.

Unit tests cover twenty entries, refresh/new document, duplicate observations,
pure reads, Strict Mode, rerender/remount, storage corruption/access/read/write
failure, copied/independent tabs, resource integrity/frame/baseline, all mappings,
both image failures and a late Swim decode after Boxing is already loaded.

The dedicated actual-App browser fixture runs **Strict Mode** and instruments only
the avatar session key to assert exactly one successful parity write per entry.
It checks twelve-plus visits, real history navigation, refresh/direct entry,
selected nav, scrolling, Capture/Finance Lock, freeze/resume/duplicate restore
events, held old image loads, both failed resources and storage recovery. It also
opens an actual child tab, verifies storage was copied from the opener, and checks
fresh Swim, independent child reload and unchanged parent next form.

Production-mode PWA checks precaching and offline reload alternation with actual
decoded Swim/Boxing, alongside all previous outfits and auth boundaries. The broad
browser suite retains routing, responsive/safe-area, player, About and Today checks.
All fixtures use synthetic identities/repositories and block external data/paid
services. No live financial/workout/Review saves or Guest sign-out are performed.

```powershell
# From frontend, Vite on port 5181. Run fixture dependencies in this order.
node scripts/aboutBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
# Once the exact staging SHA is Ready:
node scripts/aboutStagingValidation.mjs <full-ready-staging-sha>
```

Full Vitest, TypeScript, lint, production build, demo Firestore Emulator and all
Functions packaging are required. Exact results/CI/Ready deploy are in delivery.
Local checks passed: **192 Vitest files / 1,491 tests**, TypeScript, lint without
new warnings, production build with **43 precache entries**, demo Firestore rules
and all five Functions packages. Existing large-chunk build advisories remain.
The dedicated Strict Mode browser entry suite and offline PWA four-reload sequence
passed, including actual opener storage cloning and one-write-per-entry assertions.
The complete multi-page browser run passed at 320/390/1440 widths with no runtime
exceptions, including original Today Capture and Anime fullscreen. An earlier
parallel run timed out at Today Capture; a serial rerun passed without application
changes. The dedicated fixture waits for Drawer focus/input-shield restoration
before opening Capture, rather than bypassing its close animation programmatically.
Firebase parity is **not verified**. Production, Firebase/Netlify sensitive config,
Rules and real user data remain unchanged.

Rollback reference: `6016dd59c823e982e158e264f6c66d2961ebb525`, Ready deploy
`6b00b28b7eb72456133847b2`. No automatic rollback is authorized or performed.

## Owner acceptance and stop boundary

On iPhone Safari, installed PWA and desktop: check Swim/Boxing legibility,
goggles/gloves/towel/bottle/equipment/keychain/wings, full silhouette and baseline
at 88×164. Enter/leave at least twelve times, refresh, use direct links/history,
selected nav, scroll, Capture, lock/PIN/modal/Genesis, keyboard/landscape/safe areas.
Check same-tab freeze/BFCache/PWA cold/warm restoration, new/duplicated tabs,
offline refresh and independent tab parity. Recheck all previous avatars, Today
Capture, Anime player and About's three gestures. Automation is not iPhone approval.
Stop after staging technical delivery and await acceptance; no Cosmos, Part 5/6
or Production release.
