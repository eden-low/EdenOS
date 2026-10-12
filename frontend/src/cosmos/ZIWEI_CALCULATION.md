# Cosmos Zi Wei Dou Shu calculation notes

## Engine and license

- Package: `iztro`
- Pinned version: `2.6.2`
- License: MIT, copyright 2023 All Contributors
- Source: <https://github.com/SylarLong/iztro>
- Documentation: <https://docs.iztro.com/>
- npm package: <https://www.npmjs.com/package/iztro>

The production bundle imports only iztro's local chart engine. EdenOS does not
use iztro AI, Chat API, Agents SDK, CDN build, or any hosted service.

The package ships TypeScript declarations and works in the existing Vite
build. Version 2.6.2 has four runtime dependencies: `dayjs`, `i18next`,
`lunar-lite`, and `lunar-typescript`; the latter is deduplicated to EdenOS's
existing pinned `1.8.6` installation.

## Supported inputs

EdenOS accepts Gregorian dates from 1970-01-01 through the current local date,
with an engine ceiling of 2100-12-31. iztro's underlying `lunar-lite` tables
cover Gregorian dates from 1900-01-31 through 2100, but EdenOS deliberately
uses 1970 as its historical IANA timezone boundary, consistent with the
Western Astrology form.

The input date and time are the civil clock record at the birthplace. The IANA
timezone validates that the clock time existed and detects repeated times
during daylight-saving changes. The chart engine receives the original civil
date and traditional hour index. The date is never shifted by converting it to
UTC.

Birthplace coordinates are not used. Phase 4B does not apply longitude or true
solar-time correction.

## Fixed calculation convention

The adapter calls `astro.withOptions()` with chart-local settings:

- `algorithm: 'default'`: iztro's commonly used/default placement rules.
- `yearDivide: 'normal'`: birth year changes at Lunar New Year.
- `dayDivide: 'forward'`: late Zi hour belongs to the following day.
- `fixLeap: true`: in a leap lunar month, days 1–15 use that month's placement
  and days 16 onward use the following month's placement.
- `language: 'zh-CN'`.

No global iztro configuration is mutated.

Civil-time mapping follows the installed API's 0–12 contract:

- 00:00–00:59: early Zi, index 0.
- 01:00–02:59: Chou, index 1, continuing in two-hour intervals.
- 21:00–22:59: Hai, index 11.
- 23:00–23:59: late Zi, index 12.

Male/female is presented as a required traditional calculation option. The UI
does not infer identity and does not select a value by default.

## Normalized data

`ziweiAdapter.ts` is the only Cosmos module coupled to iztro. It normalizes and
checks:

- exactly 12 unique palaces and 12 unique Earthly Branch positions;
- exactly one Life Palace and one Body Palace marker;
- all 14 unique major stars;
- the four unique birth-year transformations;
- palace stems and branches, selected supporting stars, lunar date, cyclical
  date, Life/Body masters, and Five Elements Bureau.

The Body Palace remains a marker on one of the twelve palaces. Supporting-star
display is limited to the six auspicious stars, six malefic stars, Lu Cun and
Tian Ma so that the mobile overview remains readable.

## Accuracy checks

The tests do not use a snapshot generated from EdenOS itself as their only
oracle.

1. The 1990-06-15 09:30 male example is recounted from the published lunar
   month/day, Life/Body formulas, Five Tigers palace stems, Bureau table, Zi
   Wei/Tian Fu placement sequences, and Geng-year transformation table. The
   test fixes every palace stem/branch, all fourteen stars, Life/Body positions,
   Fire Six Bureau, and all four transformations.
2. The official iztro documentation example for 2000-08-16, female, Yin hour
   fixes the lunar date, Life and Body branches, masters, Wood Three Bureau,
   and Life-palace Zi Wei placement.
3. Ten post-Lunar-New-Year dates from 1984 through 1993 exercise every birth
   year stem against the independently tabulated Lu/Quan/Ke/Ji star mapping.
4. Hong Kong Observatory's Gregorian–Lunar conversion table and a published
   2020 leap-month notice confirm that 2020-05-23 begins leap fourth month.
   Tests cover both halves of that leap month with `fixLeap=true`.
5. Structural tests enforce traditional invariants across the normalized
   output: twelve unique palaces/branches, fourteen unique major stars, one
   Life and Body marker, and four unique transformations.

Reference material:

- iztro chart API and output: <https://docs.iztro.com/posts/astrolabe>
- iztro configuration: <https://docs.iztro.com/posts/config-n-plugin>
- Published worked placement example: <https://zi-wei-dou-shu.com/en/learn/chart-calculation>
- Hong Kong Observatory conversion tables: <https://www.weather.gov.hk/en/gts/time/conversion.htm>
- 2020 leap-fourth-month report: <https://sz.people.com.cn/n2/2020/0523/c202846-34037605.html>

Zi Wei Dou Shu schools differ in year boundaries, late-Zi treatment, leap-month
handling, transformation tables, brightness tables, and star-placement rules.
EdenOS exposes one documented convention and does not combine schools.
