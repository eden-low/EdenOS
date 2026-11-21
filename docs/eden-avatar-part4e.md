# Eden Avatar Part 4E — static wardrobe verification and acceptance

## Status and boundaries

**Automated technical delivery ready; owner acceptance pending. Not Accepted.**
An intermittent development Capture observation remains an open acceptance risk;
see the investigation below. This is not a claim that all original Part 4 work
or real-device acceptance is complete.

This phase covers the existing thirteen identities, page/system selection, safe
display, lifecycle, performance evidence, accessibility and PWA. It does not add
Wardrobe Gallery (4F), animation frames, Part 5/6/7 or Production work. The original
88 × 164 CSS frame, native aspect ratios, transparent padding and approved poses
are retained. Watching's prone silhouette, Reflector's native right-facing art
and Cosmos cloaks/ribbons are not stretched, cropped or mirrored to fill a height.

Baseline and rollback candidate: staging SHA
`46bd88f58abef978e8a0cdddc0a86cd4495786d8`, Ready deploy
`6b00d4052ea0a3ec08df8429`. The fresh check found main unchanged at
`f4b0b26b2398f040576fa01c81a9ef542407e389`, no open PRs and successful baseline CI
44835151051. Development uses an isolated worktree/branch; unrelated work remains
untouched. Direct staging promotion is explicitly authorized for this Avatar work.

## A. Thirteen-identity static system

| Page / actual selection | Identity | Preserved behavior |
| --- | --- | --- |
| Today | `eden-default` | Original blink, Today-only +, Capture move/perch/return |
| Expenses | `eden-treasurer` | Abacus still, right corner |
| Records | `eden-archivist` | Clipboard still, right corner |
| Weekly Review | `eden-reflector` | Journal still, left corner, native right-facing, mirrored original fallback only |
| Anime | `eden-watching` | Prone still, right corner, player/fullscreen occlusion |
| Exercise, odd committed entry | `eden-swim` | Tab-local deterministic alternation |
| Exercise, even committed entry | `eden-boxing` | No count on rerender, same selection, lock, modal or restore |
| Cosmos `tarot` | `eden-tarot` | Shared actual selection, no result-dependent changes |
| Cosmos `iching` | `eden-iching` | Same typed selection |
| Cosmos `bazi` | `eden-bazi` | Same typed selection |
| Cosmos `astrology` | `eden-astrology` | Same typed selection |
| Cosmos `ziwei` | `eden-ziwei` | Same typed selection |
| Cosmos `ai` | `eden-ai-explorer` | Includes Ask Cosmos internal system links |
| About | No global avatar | Dedicated Smile / Think / Wave v2 preserved |

Finance Locked/Unlocked alone neither hides nor changes the wardrobe. True
dialogs/PIN, Genesis, fullscreen, keyboard/focused controls and insufficient space
retain precedence. The global decoration remains inert, aria-hidden and
pointer-events:none. No live financial, exercise, reflection or Auth operation is
used in automated browser checks; all identities/data are synthetic and writes
throw. Firestore tests use the explicitly named demo emulator project.

## Performance baseline, before considering optimization

`scripts/avatarSystemBaseline.mjs` measures the unchanged runtime, rather than
deriving claims from imports or registry entries. It records CDP Image requests,
successful application `HTMLImageElement.decode()` calls, rendered nodes, resource
timings, browser JS heap/DOM metrics, frame intervals, fixed-corner samples,
layout-shift observations and the real built precache manifest/files.

The repeatable machine-readable evidence is
[`evidence/eden-avatar-part4e-baseline.json`](evidence/eden-avatar-part4e-baseline.json).
Full raw observations remain in ignored browser artifacts. Decode API calls are
not a claim about physical decoder cache executions. Browser JS heap/DOM metrics
do not expose image/native/GPU resident memory; that value remains unmeasured.
No synthetic test result is described as iPhone Safari or installed iOS PWA.

Initial Cosmos requests the original sprite placeholder and Tarot art, with one
successful static decode and one rendered static image. The other eleven static
URL imports in development are small JavaScript modules, not eleven decoded
images. The first complete six-system visit and sixty rapid selections are
recorded separately from initial entry. An already cached compressed WebP may be
requested again; this does not imply multiple live avatar elements or all-role
decoding. The app's stale-load guard allows only the selected character or the
original fallback to appear while loading.

Measured on the baseline SHA with Chrome 157, 390 × 844 mobile viewport:

| Observation | Actual sample |
| --- | --- |
| Initial real Image requests / static decode / rendered static image | 2 / 1 / 1; original placeholder plus Tarot only |
| Six-system warm visit, then 60 rapid selections | 66 cumulative explicit decode calls; 5 additional Image requests during rapid switching, zero wrong-system pixels |
| All global Avatar WebP resources / separate About art | 1,084,838 / 660,314 bytes, unchanged |
| JS heap: initial / six warmed / after 60 switches | 23,636,468 / 28,003,284 / 36,050,800 bytes |
| JS heap after routes / explicit diagnostic GC | 35,808,656 / 30,432,872 bytes; 308 DOM nodes after GC |
| Continuous-scroll sample | 109 frames; largest observed gap 18ms; fixed corner throughout |
| Seven route changes | 175–346ms including actual drawer-close and QA wait |
| Seven 6,000px scroll / 200% text samples | Stable 88 × 164 frame, no document horizontal overflow, inert/aria-hidden/pointer-events retained |
| Ordinary selection/scroll layout shift | No recorded shifts; 19 expected shifts belong to explicitly labelled QA spacer/text resizing; none source the Avatar |
| Actual production precache | 49 entries; 4,236,411 bytes summed from manifest-referenced payloads |

The measured heap includes React, route modules, local engines and temporary DOM;
it is not an Avatar-only or iOS memory measurement, nor proof of absence of every
possible leak. The existing >500kB bundle advisory remains. No repeatable,
attributable performance problem justified changing runtime code or asset sizes.

Seven resident pages additionally receive a temporary, noninteractive 6,000px QA
spacer for full-distance scroll sampling. Each also receives a temporary 200% root
text size; these deliberate content/size changes are labelled separately from
ordinary scroll and selection. Raw layout shifts from deliberately resizing text
or removing the spacer are not presented as spontaneous Avatar layout jumps.
Navigation timing includes the actual drawer closing and QA wait, not an isolated
Avatar render benchmark. Whole-page startup/local engine long tasks cannot be
attributed to the Avatar solely by temporal overlap.

Only a repeatable, attributable failure justifies a minimal runtime change.
No theoretical performance refactor, cache eviction, visual-height normalization,
new dependency or state-machine/navigation/layout redesign is authorized here.

## Lifecycle, resource failure and PWA update coverage

- All twelve static materials: network/decode/display failure, selected-resource
  online retry, stale completed/rejected decode, unmount cleanup and Reduced Motion.
- New Strict Mode coverage checks that discarded loaders and failed-resource
  online listeners are removed; dispatching online after unmount creates no loader.
- Exercise's actual Strict Mode App fixture checks twelve alternating entries,
  refresh/direct address, history, duplicate route/pageshow/visibility events,
  freeze/resume, storage failure/corruption and a real opener-copied child tab.
- The baseline includes an actual document navigation away and history return;
  a successful BFCache restore must retain the same document, image and entry.
  A platform declining BFCache is separately recorded as a genuine new document.
- Cosmos tests use click, arrow/Home/End and Ask internal links, arbitrary/rapid
  switching, late images, all six failures/online recovery, retained local inputs
  and calculations, freeze/resume and leave/return. No paid interpretation runs.
- A local production-mode PWA uses the real Vite/Workbox configuration and actual
  PwaProvider/update prompt with synthetic read-only repositories. All six Cosmos
  compressed resources are cached, while first entry decodes Tarot alone.
- The PWA suite builds two distinct QA revisions at the same local origin. It
  checks a waiting-worker prompt, no automatic reload, explicit Update now,
  new-build activation/reload, removal of obsolete precache JS and unchanged cache
  entry count, then offline cold reload and all six forms again. It never manually
  unregisters a worker or deletes browser caches to manufacture this result.
- The production-mode offline PWA also repeats both Today Capture triggers eight
  times, alternating Today/Anime during return, with successful perch/cleanup.
- This validates Chromium's generated PWA behavior. iOS process eviction,
  standalone restoration and WebKit storage/update policy still require real-device
  acceptance. Auth, manifest start URL and SW update mechanism are unchanged.

## Reproduction and release evidence

From `frontend/`, use the existing Vite QA server on localhost:5181, with generated
artifact directories excluded from Windows file watching if required. References
must be prepared before normal Vite startup. Browser scripts run serially because
fixture preparation writes shared, ignored QA files.

```powershell
npm test -- --reporter=dot
npx --no-install tsc -b
npm run lint
npm run build
node scripts/aboutBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/cosmosAvatarBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/avatarCaptureLifecycleValidation.mjs
$env:AVATAR_BASELINE_SHA = (git rev-parse HEAD)
node scripts/avatarSystemBaseline.mjs --write-evidence
node scripts/aboutPwaValidation.mjs
node scripts/aboutStagingValidation.mjs <full-ready-staging-sha>
```

The existing demo Firestore emulator rules suite and five Netlify Functions
packages are also required. Exact final test count, CI URL, staging SHA and Ready
Deploy ID are supplied in the release report. Firebase parity is **not verified**;
synthetic auth context and deployed unauthenticated 401s do not establish parity.
No credentials, real records, Firebase/Netlify sensitive configuration, Rules or
Production are changed. A rollback reference is recorded, not executed.

Final local checks: **195 Vitest files / 1,571 tests passed**, TypeScript, lint,
Build, demo Firestore rules and five Functions packages passed. About, Today,
Cosmos engines, Exercise and offline/update PWA browser suites passed. The final
two full eight-route/three-width browser runs passed with no runtime exceptions.
`avatarCaptureLifecycleValidation.mjs` additionally passed thirty real trigger
cycles across 320/390/1440px, both Today entrances and route changes during return.

### Intermittent development Capture observation — not claimed fixed

The first full route run in this phase timed out after closing Anime Player and
opening Today Dashboard Capture: the Sheet DOM was open, while Avatar state stayed
idle/hidden with no published anchor and no runtime exception. A similar timeout
was recorded during 4D. Temporary diagnostic instrumentation, a short reproduction,
two subsequent full route runs, thirty repeated route/trigger cycles and eight
production-mode offline PWA cycles did not reproduce it again. No deterministic
cause was established. No timeout extension, retry-to-pass logic, artificial
runtime delay, suppression or unproven bridge/state-machine rewrite was added.
Temporary focused-mode/fiber diagnostics were removed from the shared route test.

This observation remains **unresolved**, rather than being reported as repaired
or as an iPhone result. The final checks are green, but owner acceptance must
explicitly include repeated Anime Player close → Today Capture and rapid page
changes. If it recurs, retain the exact sequence/recording and investigate the
actual anchor publication lifecycle before proposing a narrowly supported fix.

## B. Original Part 4 animation requirements — still pending

The twelve new identities remain static prototypes. **None** has newly completed
dedicated blink frames or independent prop/idle animation in Part 4E:

| Identity | Still needs dedicated approved frames |
| --- | --- |
| Treasurer | Blink and abacus calculation |
| Archivist | Blink, reading clipboard, page turn / nod |
| Reflector | Blink, journal writing / page turn / thinking |
| Watching | Blink, gaze changes and yawn |
| Swim | Blink, adjusting goggles / shoulder movement |
| Boxing | Blink and small controlled punches / glove movement |
| Tarot | Blink, cards and dedicated idle |
| I Ching | Blink, coin movement and dedicated idle |
| BaZi | Blink, opening calendar scroll and dedicated idle |
| Astrology | Blink, astronomical chart movement and dedicated idle |
| Zi Wei | Blink, chart/ribbon effects and dedicated idle |
| AI Explorer | Blink, hologram operation and dedicated idle |

No still image is stretched, rotated or repeatedly flashed to imitate those
actions. Today's original sprite/blink/Capture and About's existing gestures are
separate accepted features; their existence does not complete these twelve sets.

## Owner acceptance — pending

The owner must explicitly confirm before changing this phase to **Accepted**.
At https://staging--edenos.netlify.app, test iPhone Safari, installed PWA and desktop:

1. All thirteen identities, approved proportions/padding, face/glasses/wing and
   small props; Watching prone and native right-facing Review without double mirror.
2. Long scroll and touch-through; Save Reflection hit target without saving;
   Today-only + and both Today Capture triggers, movement/perch/close/rapid reopen.
3. Exercise real entry/refresh versus selected navigation, tab return and BFCache;
   Cosmos fast/keyboard/Ask links and history leave/return without input loss.
4. Locked/Unlocked unchanged; real PIN, Genesis Skip/Replay, Anime player/fullscreen,
   keyboard/focused input, portrait/landscape, safe areas, 200% text and Reduced Motion.
5. PWA cold start and restored visibility; deliberate update when no valuable
   draft is pending; offline cached deep links and reconnect; signed-in session and
   offline access protection. Do not sacrifice a valuable Guest UID to test sign-out.
6. About Smile/Think/Wave v2, keyboard focus and no overlapping global figure.

Stop after Staging technical delivery. No 4F, new animation batch, Part 5/6/7,
Production promotion or automatic rollback follows this document.
