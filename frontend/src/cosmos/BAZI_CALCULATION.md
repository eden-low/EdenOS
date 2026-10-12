# Cosmos BaZi Phase 3A calculation notes

## Engine and license

Phase 3A pins [`lunar-typescript`](https://github.com/6tail/lunar-typescript) **1.8.6** (release tag commit `0f3e95d15e31f1a7c7b93d624542649347328a20`). The package is published under the MIT License, includes TypeScript declarations, and has no runtime dependencies of its own.

The calendar library is isolated behind `baziAdapter.ts`. Cosmos uses it only to calculate the Four Pillars from explicit civil date and time fields. Five Element, yin/yang, and Heavenly Stem Ten Gods metadata are held and tested locally in `baziData.ts` rather than exposed as library-specific objects to the UI.

The installed package is approximately 1.36 MB unpacked according to npm package metadata. Vite includes only the imported runtime code in the production bundle; the built chunk delta is recorded in the Phase 3A release report.

## Phase 3A conventions

- **Calendar:** Gregorian input; year pillar changes at the exact Li Chun (立春) instant.
- **Month pillar:** changes at the twelve month-opening solar terms (节), not at lunar-month boundaries.
- **Timezone:** modern Malaysia civil time, `Asia/Kuala_Lumpur` / UTC+08:00, for dates from 1982-01-01 through the current date.
- **No conversion:** date and time fields are passed as civil clock components. Browser timezone does not alter them. Longitude, place coordinates, historical timezone offsets, daylight-saving rules, and true solar time are outside Phase 3A.
- **Day boundary:** `EightChar.setSect(2)`. The day pillar changes at 00:00. During 23:00–23:59, the day pillar remains on the civil date while the Zi-hour time stem follows the library's late-Zi convention. `sect=1`, which advances the day pillar at 23:00, is a recognized alternative and is not selected here.
- **Unknown time:** no hour is invented. The adapter checks both 00:00 and 23:59. If the date crosses Li Chun or a month-opening solar term, the affected year/month pillar is withheld and an uncertainty message is shown.
- **Five Elements:** the visualization counts only the visible Heavenly Stems and Earthly Branches. It excludes hidden stems and must not be interpreted as chart strength, favorable elements, or proof that an element is absent.
- **Ten Gods:** Phase 3A labels the other available Heavenly Stems relative to the Day Master. It does not assign branch hidden-stem Ten Gods.

## Validation references and limits

- The independently published 1949-10-01 `甲子` day anchor is used in tests for the day cycle.
- Published Beijing-time solar-term boundaries are used for transition tests: Li Chun at 2021-02-03 22:59 and Jingzhe at 2024-03-05 10:23. Malaysia and Beijing share UTC+08:00 for these modern dates.
- A published Four Pillars example, 1990-05-15 10:00 UTC+08, is cross-checked as `庚午 辛巳 庚辰 辛巳`.
- The upstream package does not accept an IANA timezone or geographic coordinates. Restricting the UI to modern Malaysia prevents silent worldwide or historical timezone assumptions.
- Cosmos derives displayed element, polarity, and Ten Gods metadata from fully enumerated local tables. This keeps the domain rules reviewable and independently testable instead of coupling the UI to convenience display strings from the package.

Reference links:

- [Purple Mountain Observatory calendar standard material](https://www.pmo.cas.cn/xwdt2019/kpdt2019/202203/P020240201504886119982.pdf)
- [Xinhua: 2021 Li Chun at 22:59 Beijing time](https://www.xinhuanet.com/local/2021-02/01/c_1127048975.htm)
- [Xinhua: 2024 Jingzhe at 10:23 Beijing time](https://www.gd.xinhuanet.com/20240304/8a824faba7b44932b7ea2f3e64138b24/c.html)
- [Independent UTC+08 Four Pillars reference calculator and methodology](https://toea.com/bazi-calculator)

## MIT License notice

Copyright (c) 2020 6tail

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
