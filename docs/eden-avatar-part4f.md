# Eden Avatar Part 4F — Little Eden's Wardrobe

## Delivery and acceptance boundary

**Owner accepted the Part 4F wardrobe gallery in the Part 4G-A authorization.**

The owner explicitly accepted Part 4E's static wardrobe system and authorized
this About-only gallery on 21 November 2026. This does not complete the twelve
new characters' dedicated blink/prop/idle animation. The owner's subsequent
confirmation accepts the gallery; it is not a claim of our own iPhone testing.

Fresh baseline: staging `bc46d9e9481a7048545701c1ba5d96b91b406fcc`, successful
CI 44841719318 and Ready Netlify deployment `6b00e0e2879fb38200f5b645`.
Production main: `f4b0b26b2398f040576fa01c81a9ef542407e389`. No open PRs or
conflicting modified workspaces were found. Work is isolated on
`feature/avatar-part4f-wardrobe`. The baseline SHA/deploy are the rollback
reference; no rollback is performed or authorized by this document.

## Components and state ownership

- `aboutWardrobeContent.ts` owns the approved display order, Chinese/English
  names, clothing descriptions and UI copy. Entries reference typed `AvatarId`s,
  not copied URLs or a large conditional JSX chain.
- `AboutWardrobeGallery.tsx` owns a single component-local index. Character click,
  next and previous use deterministic modulo 13; direct cards set that exact index.
  Selecting the active card is a no-op. No timer, randomness, storage, Firebase,
  record read, success event, exercise counter or Cosmos setter is involved.
- `AboutWardrobePreview.tsx` resolves actual art through `avatarRegistry.ts` and
  separately owns only selected-resource loading/error/retry state. Its button
  stays mounted across selection: Enter/Space and repeated clicks retain focus.
  Inner artwork and the cancellable decode callback change instead of remounting
  the interactive control. The initial implementation remounted that button;
  focused testing caught this and a full-cycle focus regression now prevents it.
- `aboutWardrobe.css` supplies only About-scoped layout using existing tokens.
  Desktop is a preview/card-grid split; phones stack preview, caption, controls
  and wrapping text cards. The preview frame has a stable height, no auto motion,
  no fixed-corner positioning and no clothing transforms.
  At 390px/200% text, initial testing measured roughly 157px of section-height
  variation between captions. Small hidden/inert text-only sizing copies now let
  CSS grid reserve the tallest caption and resource message at the current font
  and width. Only the selected caption is exposed to accessibility; no extra
  images, timers, resize observer or clipped/fixed-height text is involved.
- `AboutPage.tsx` inserts the gallery after Interactive Eden, before the existing
  Footer; it adds the chapter link and known `#eden-wardrobe` target. Initial lazy
  mount, hashchange, popstate and restored pageshow use the same target lookup;
  listeners and the title are cleaned up on unmount.

About Hero/copy/footer and `AboutInteractiveAvatar.tsx`/its machine are unchanged.
The gallery never triggers Smile/Think/Wave and no global Avatar is mounted on
About. No global registry entry, page selection, Exercise entry lifecycle, Cosmos
selection, Capture machine or viewport positioning implementation is changed.
Leaving/re-entering About creates index zero; same-document fragment navigation
keeps the component state. Native reload is a new component/document.

## Display order and reused sources

| No. | Display name | Registry ID / existing resource |
| --- | --- | --- |
| 01 | Original Eden · 日常版 | `eden-default`; existing `AvatarSprite`, standing/open-eyed atlas frame |
| 02 | Treasurer Eden · 财务管理员 | `eden-treasurer`; abacus WebP |
| 03 | Archivist Eden · 档案管理员 | `eden-archivist`; clipboard WebP |
| 04 | Reflector Eden · 周记员 | `eden-reflector`; journal WebP, native right-facing |
| 05 | Watching Eden · 追番版 | `eden-watching`; prone WebP |
| 06 | Swim Eden · 游泳版 | `eden-swim`; approved swim WebP |
| 07 | Boxing Eden · 拳击版 | `eden-boxing`; approved boxing WebP |
| 08 | Tarot Eden · 星辰占卜师 | `eden-tarot`; approved card/cloak WebP |
| 09 | I Ching Eden · 易经卦师 | `eden-iching`; approved green robe/coins WebP |
| 10 | BaZi Eden · 八字书生 | `eden-bazi`; approved calendar-scroll WebP |
| 11 | Astrology Eden · 星空观测者 | `eden-astrology`; approved astronomical WebP |
| 12 | Zi Wei Eden · 紫微星官 | `eden-ziwei`; approved ornate star-officer WebP |
| 13 | AI Explorer Eden · AI 探索者 | `eden-ai-explorer`; approved hologram WebP |

No new/copy image, original PNG, regenerated pose or new image dependency is
added. The default uses `AvatarSprite` with `perched=false`, `attentive=false`,
`still=true`, viewBox `144 0 256 512`. The closed-eye branch is hidden in gallery
CSS; neither the whole atlas nor Capture's lower row is presented.

All static materials retain their original ratio, transparency and native
direction. `object-fit:contain` displays the standard frames without body cropping.
Reflector is not mirrored. Watching uses the same registry URL in an SVG with
viewBox `0 373 352 283`: this removes only the existing transparent upper frame
padding for a landscape presentation, not character pixels. The original sidecar
places its 336×267 illustration at x=8/y=381 inside 352×656; the new view includes
eight pixels of clearance above and the full lower frame. A decoded-alpha test
asserts **every nontransparent runtime pixel remains inside the display window**.
No runtime asset or global 88×164 placement changes.

## Loading, accessibility and safety

Only the selected static outfit instantiates an Image/decode loader. Cards are
lightweight text buttons, so there are no thirteen thumbnail decodes. Original
Eden is the initial/loading/error fallback; new pixels appear only after decoding.
Active guards cancel stale success/failure; resource changes/unmount clear image
handlers. Inner images are keyed by identity, while the actual next-clothing
button remains stable. Failed resources retry on `online`, with listener cleanup.
A failed original atlas has its own visible message and can retry; choices remain
available. No layout measurement from another page or DOM tab selection is used.

Real buttons support native Enter/Space/Tab. Cards use `aria-pressed`; one stable
polite live region announces current number/name. Preview has the accessible name
“查看下一套服装” and a description reference to the displayed selection/caption.
Focus outlines remain visible. The decoration inside the button is aria-hidden,
but the button itself is interactive, without copying global Avatar inert rules.

An About-local observer tracks real dialog/alertdialog/Genesis overlays and
document visibility. While obstructed, the fieldset is disabled and inert. Event
handlers also check the actual obstruction synchronously, closing the gap before
observer delivery. Radix/Genesis retain their existing modal focus protections.
The selected outfit is preserved while covered; Finance Locked alone does not
block browsing. Observer and visibility/online listeners are removed on unmount.

## PWA, performance and verification

The original atlas and twelve WebPs were already covered by existing precache
patterns. No manifest/start URL, cache rule, worker mechanism or Netlify setting is
changed. The gallery remains inside the existing lazy About route. Initial gallery
entry requests no unselected static outfit and performs zero static outfit decode
calls. About's existing Hero/gesture art and the original atlas load as required.
Decode-call observations do not claim native/GPU resident memory measurements.

The focused browser script covers all thirteen click steps/wrap, previous/next,
direct/repeated selection, actual pointer/Enter/Space/Tab, AX names/pressed state,
stable frame, complete Watching view, native Reflector, late images, failed normal
and SVG resources with online recovery, real Apps modal/Genesis, Finance Lock,
chapter anchors/reload/history and independent Exercise/Cosmos behavior.

Responsive samples: 320/375/390/430/768/1024/1440px, both themes, 200% root text,
landscape with emulated safe areas, Reduced Motion/Transparency and Forced Colors.
Desktop/phone screenshots are inspected locally. These are **Chromium synthetic
checks**, not real iPhone Safari, VoiceOver or installed iOS PWA acceptance.

The production-mode PWA suite also browses all thirteen outfits offline, checks
that this consumes no Exercise parity, applies a real waiting-worker update,
verifies obsolete JS cache replacement and revisits all thirteen offline after
the update. Existing About gestures, Today Capture, page deep links and offline
authentication boundaries remain covered. Exact final test totals, CI, SHA,
Ready deploy are reported with delivery. Final local results: **197 Vitest files /
1,586 tests passed**, TypeScript, lint without new warnings, Build, demo Firestore
rules and all five Functions packages passed. Existing large-chunk advisories
remain. About/wardrobe, Today, Exercise and Cosmos browser suites passed; the
full route suite passed its final rerun, with the first known-observation failure
retained below. The final wardrobe browser also verifies SVG-display and original
atlas error/reconnect paths, not just static preloader failure.

PWA precache remains **49 entries**, both before and after explicit update; the
actual manifest-referenced production payload sums to **4,249,940 bytes**, an
increase of **13,529 bytes** over the recorded 4E build. No image bytes change.
Fresh About image requests are its existing Hero, gesture atlas, Wave v2 atlas
and original global atlas: zero unselected static outfit requests/decode calls.
At 390px/200% text, every selected look now measures the same section height
(4651.765625 CSS px in the recorded fixture); the preview frame stays fixed.

```powershell
# frontend/, Vite QA server on 5181; fixture-generating suites first
npm test -- --reporter=dot
npx --no-install tsc -b
npm run lint
npm run build
node scripts/aboutBrowserValidation.mjs
node scripts/avatarRouteBrowserValidation.mjs
node scripts/aboutWardrobeBrowserValidation.mjs
node scripts/avatarBrowserValidation.mjs
node scripts/exerciseAvatarBrowserValidation.mjs
node scripts/cosmosAvatarBrowserValidation.mjs
node scripts/aboutPwaValidation.mjs
node scripts/aboutStagingValidation.mjs <full-ready-staging-sha>
```

The existing demo Firestore Emulator rules and five Netlify Functions packaging
checks are also required. All browser data/repositories/identity are synthetic,
mutating operations throw, and external Firebase/paid endpoints are blocked.
Live smoke uses fresh unauthenticated Chrome and verifies Functions reject with
401 before upstream work. Firebase parity remains **not verified**. No real
financial, workout or Review writes, Guest exit, paid Gemini call, credential,
Rules, Firebase/Netlify sensitive configuration or Production change is performed.

## Known observation retained from Part 4E

The first full cross-page run in this phase reproduced the already recorded
observation in development-mode automation. Sequence: complete eight-route checks at
390/320/1440px; canonical/legacy hash and restored-pageshow checks; local Cosmos
shuffle/reveal; open the synthetic Anime Player, Space to play, F to fullscreen,
exit fullscreen and close; navigate to Today; open Dashboard Capture. The Sheet
DOM was open but Avatar remained idle/hidden without a sheet anchor; no runtime
exception was recorded. Original failure log is retained separately as
`artifacts/avatar-part4f-avatarRoute-browser.log`, rather than overwritten by a
rerun. The observation is **not declared fixed**, and no Capture state-machine or
bridge change is part of 4F. Repeat it during owner acceptance and retain any new
recording/sequence. This known observation is separate from wardrobe selection.

## Part 4G handoff — interfaces only

Gallery selection and display copy remain in the About-local configuration/index.
The preview accepts a typed look and next action, and resolves identity/material
through the existing registry. A separately approved future frame renderer could
replace its static inner art while preserving buttons, local selection, loading,
focus, caption and modal guards. That future controller should own its animation
run/timers and cancel them on identity change, obstruction and unmount.

No animation controller, new frame metadata, blink, prop action or fake still-image
transform is installed now. Twelve new outfits still need approved dedicated
frames. Today's original blink/Capture and About's existing three-action machine
remain separate owners. Do not bind Gallery browsing to real financial/workout
events, Cosmos calculations or paid AI. No 4G/Part 5/6/7 work starts automatically.

## Owner acceptance checklist — retained for regression

At https://staging--edenos.netlify.app/about#eden-wardrobe, owner checks:

1. iPhone Safari and installed PWA: all thirteen identities and props, especially
   Watching's complete horizontal pose and Reflector's correct direction.
2. Character tap, full loop/wrap, previous/next and direct cards; repeated selected
   card; focus retention, VoiceOver names/live feedback and 200% text.
3. Portrait/landscape/safe areas, both themes and OS accessibility preferences.
4. Actual PIN/Apps/Genesis modal protection and Finance Locked/Unlocked browsing.
5. About gestures/Hero unchanged; Exercise entries and Cosmos system choice
   independent; refresh, history, direct/section links and leave/re-entry.
6. PWA cold start, explicit update with no valuable unsaved draft, cached offline
   gallery, network recovery, signed-in/offline Auth protection. Do not abandon a
   valuable Guest identity for testing.
7. Desktop keyboard/mouse and existing pages; repeat the known Anime Player close
   → Today Capture path, including rapid reopen and page switching.

The owner subsequently confirmed satisfaction with the staging wardrobe and
authorized Treasurer-only Part 4G-A. This checklist remains useful for regression.
No Production release or automatic rollback follows that confirmation.
