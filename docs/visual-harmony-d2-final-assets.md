# Visual Harmony D2 — Archivist and Reflector canonical static assets

2026-11-24. Owner authorized these two asset fixes and a normal direct Staging release after testing. No PR workflow is used. Production and Phase E are outside scope. Owner real-device acceptance remains pending.

## Design and source decision

All six existing cells of both atlases were reviewed side by side on light, dark, white, purple and transparency-check backgrounds. The existing motion designs retain Eden's curls, glasses, wing details, backpack, clipboard/journal and stable feet, with consistent clothes across their six cells. Their complete, native rest cells are the canonical designs:

- **Archivist:** existing dark jacket, bunny accessory and complete grey trousers. The prior still had alpha 0/4 at interior trouser samples (90,350), (110,350), (90,400); the atlas has alpha 253 there.
- **Reflector:** existing dark striped jacket and journal pose, consistently used by the motion atlas. The old still's light-trim cardigan is retained in the historical backup, not mixed with the animated jacket.

The existing normal animation designs were selected for completeness, six-cell consistency, recognizable identity and native sharpness. No new drawing, AI repaint, clothes design, animation frame, blur, alpha painting or CSS concealment is introduced.

## Reproducible derivation

```sh
cd frontend
node scripts/prepareD2AvatarStatics.mjs
node scripts/prepareD2AvatarStatics.mjs --check
```

The script accepts only the reviewed atlas SHA256 values and extracts the original 264×492 rest cell (cell 1 / zero-based frame 0). It does **not resize**. It uses lossless WebP encoding and verifies identical alpha and all visible RGB against the decoded atlas cell. RGB under already-zero alpha is irrelevant to display and is normalized for comparison; no alpha value is changed.

Historical `prepareArchivistAvatar`, `prepareReflectorAvatar` and motion-source scripts remain recipes for their original versions, with original source-hash gates. `prepareD2AvatarStatics.mjs` is the current D2 canonical-static entry point and must run last if rebuilding from historical source recipes. It updates the two static manifests and adds canonical-static provenance to the motion manifests, preserving historical sources/limitations.

| Asset | Runtime size | Bytes | SHA256 |
| --- | --- | --- | --- |
| Archivist static | 264×492 | 100814 | `078116da0f3f69aaea0632dc1af9225f7345b1bad97df0e1a2a8c0cd0c9fd475` |
| Reflector static | 264×492 | 87216 | `dddd16cda31445da237139989eab5898eb74e3574132158bc8ba8f4a235d6879` |
| Archivist atlas, unchanged | 792×984 | 251196 | `44ec07f5377cc7487e2fdc0706e35d0be03e569ff62b44821d0b9b5e625efb3f` |
| Reflector atlas, unchanged | 792×984 | 227502 | `13b69909347234b5c5c4bf3e2b6bf6ceb1a3ca53f4cdfa1bee394a16e00af849` |

Both runtime CSS frames remain **88×164**, foot anchors remain `(0.5,1)`, native facing remains unchanged. Reflector's intrinsic registry size changes from 352×656 to the native 264×492 cell, so there is no synthetic upscaling or mismatch in aspect ratio. Native 3× page assets and DPR3 Wardrobe captures were inspected; this is raster art, not a promise of unlimited zoom detail. Lossless encoding adds **75,632 bytes (~73.9 KiB)** across the two stills; no extra atlas/request or cache mechanism is added.

## Verification

- Full Vitest: **208 files / 1645 tests passed**. TypeScript, Oxlint, Production Build passed.
- Existing Registry/Motion tests remain; new pixel-level checks pin both original atlases, verify trousers and exact static/rest identity, and verify first/last sequence frames remain frame 0.
- Native controller captures include all five blink steps and all five page-action steps for both roles, Before/After and Light/Dark. Raw source comparison and browser Canvas decoding both show **0 changed alpha / 0 changed visible RGB** for the new stills versus rest cell 1.
- Actual 88×164 element screenshots: Dark static/rest comparisons are pixel-identical; Light has one bottom-edge pixel per role differing by at most 1/255. This is reported rather than claiming every composited screenshot is bit-identical. No clothes/body/feet jump is visible.
- Normal wall-clock recordings capture static → 30 seconds of original blink/page action → static pause → motion resume. Playback rates are untouched.
- Actual Records/Review pages and Wardrobe: 320/390/1440px, Light/Dark; mobile Wardrobe also at emulated DPR3. Existing docks, page scroll, return and 13-look switching pass.
- Three animated-role lifecycle regressions cover pause, document hide/freeze, resume, Reduced Motion, SVG error and online retry. Actual local image network-failure/recovery is also checked.
- Today/Capture regression passes (124 assertions), Records/Anime dock regression passes (108 assertions), About anchors/interactions/13-look Wardrobe passes (208 assertions across Before/After), Command regression passes. No real backend writes.
- Real Workbox/PwaProvider isolated production fixture passes controlled reload, offline cold launch/Capture, role routes, all 13 Wardrobe identities, update prompt and explicit apply. Five Netlify Functions package successfully; not invoked with data. Firestore Emulator Rules not run: no Rules/backend changes.

All screenshots and videos are actual browser rendering with synthetic local data; they are not AI design mockups. Headless Chromium at mobile sizes/DPR3 does not replace native Safari, iPhone keyboard, installed-PWA update or real-device performance acceptance.

## Preservation and acceptance

Other eleven identities and all three motion WebP atlases remain byte-identical. No changes to the playback controller, sequence definitions, frequency, Today/Capture, business logic, Command alignment, About biography, auth/privacy/Genesis/PWA core, Firebase, Netlify configuration or Rules.

The two identified **D2 asset P1 defects are eliminated in the verified candidate**. This does not mark all of Phase D Accepted: owner iPhone Safari / installed PWA / Desktop visual acceptance is pending. Anime Player → Today Capture occasional failure to perch remains a Known Risk despite three synthetic passes; no root-cause fix is claimed. Earlier unrelated 200% root-font risks remain outside this asset task.

Baseline and rollback reference: `47b08a0ed9f2e7bdfb0eb779be0932f0d967dfeb`, Ready deployment `6b04d96c580864b603e25a37`. No rollback is authorized/performed. Production main stays `eb84d5c994681eee0c28a87ac5a12e331d9082f3`.

Original two stills, two atlases and all four manifests are backed up outside Git at `D:/EdenOS-Visual-Harmony-D2-20261124/backups/original-assets/` and retained by the baseline Git history. Full Chinese Before/After report, native videos, all frame captures, logs and final SHA/deployment details are preserved in `D:/EdenOS-Visual-Harmony-D2-20261124/reports/`.
