# Cosmos Phase 4A astrology calculation notes

## Selected engine

Phase 4A uses [`astronomy-engine` 2.1.19](https://www.npmjs.com/package/astronomy-engine), pinned exactly in `package.json`.

- Source: [cosinekitty/astronomy](https://github.com/cosinekitty/astronomy)
- License: [MIT](https://github.com/cosinekitty/astronomy/blob/master/LICENSE), copyright Donald Cross
- Runtime dependencies: none
- Browser support: ESM package with bundled TypeScript declarations
- Upstream validation: Astronomy Engine documents comparisons with NOVAS and JPL Horizons, generally within one arcminute for supported calculations.

The candidate `circular-natal-horoscope-js` 1.1.0 was not selected. Its latest npm release is from 2021, it brings older Moment, Moment Timezone, and `tz-lookup` dependencies, and its location-derived timezone behavior does not meet this phase's explicit IANA timezone and DST ambiguity requirements. Its Unlicense terms were verified, but no code or data was imported.

## Calculation conventions

- Zodiac: Western tropical zodiac, 12 equal 30 degree signs beginning at the March equinox direction.
- Planet positions: apparent geocentric vectors with aberration enabled, converted to true-of-date ecliptic longitude with Astronomy Engine `GeoVector` and `Ecliptic`.
- Objects: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto.
- Time scales: civil input is resolved to UTC first. Astronomy Engine derives UT and TT internally.
- Angles: apparent Greenwich sidereal time and true obliquity from Astronomy Engine are applied to the standard spherical formulas for Ascendant and MC. East longitude is positive.
- Houses: Whole Sign. The Ascendant's sign is house 1, followed by one complete sign per house. MC is shown as an independent angle and is not forced into house 10.
- Aspects: the shortest longitude separation between the ten planets. Fixed orbs are conjunction 8 degrees, sextile 5 degrees, square 7 degrees, trine 7 degrees, and opposition 8 degrees. Angles are excluded.
- Retrograde status, nodes, Chiron, transits, progressions, forecasts, and alternative house systems are outside Phase 4A.

## Civil time and supported scope

- Product date range: 1970-01-01 through the current date in the entered birthplace timezone.
- Timezone input: an explicit IANA identifier handled by the browser's `Intl.DateTimeFormat` timezone database.
- Ambiguous local times during a DST fallback expose every matching UTC offset for the user to choose.
- Nonexistent local times during a DST spring transition are rejected.
- Coordinates are optional. Planet positions remain available without coordinates; Ascendant, MC, and houses do not.
- Latitude must be strictly between -90 and +90 degrees. Longitude supports -180 through +180 degrees.
- The browser supplies timezone rules. A runtime without the requested IANA zone data rejects that zone instead of guessing. Dates before 1970 are deliberately unsupported to avoid presenting uncertain historical civil-time rules as exact.

When birth time is unknown, the implementation never substitutes noon or another claimed time. It samples every 30 minutes over the complete local civil date, including its final instant, and reports every zodiac sign occupied by each body. Exact longitude, aspects, Ascendant, MC, and houses are omitted.

## Independent verification

Planet and angle tests use committed reference values from the MIT-licensed [RoxyAPI astrology API benchmark](https://github.com/RoxyAPI/astrology-api-benchmark), whose planetary references were generated from [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) observer-centered ecliptic longitude output. Reference charts include Greenwich at J2000, Honolulu, and Tokyo.

Accepted test tolerances:

- Sun and planets: less than 0.01 degrees (36 arcseconds)
- Moon: less than 0.02 degrees (72 arcseconds)
- Ascendant and MC: less than 0.01 degrees (36 arcseconds)

At the committed reference cases, all asserted values stay inside those tolerances. These tolerances cover small differences in nutation, apparent-place conventions, and numerical models; the UI displays degrees to two decimal places.

## Privacy and offline behavior

All calculations run in the lazy-loaded Astrology browser chunk. Birth data and results remain in React component memory. The feature does not use storage, Firebase, Gemini, Netlify Functions, analytics, geocoding, or runtime network requests.
