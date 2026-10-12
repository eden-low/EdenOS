# Cosmos birthplace data

The Phase 4A birthplace picker contains a deliberately compact static list. It prioritizes Malaysian cities and adds common international birthplaces without adding a geocoder or large location dependency.

## Geographic data

City names, coordinates, country codes, GeoNames identifiers, and the source timezone field were selected from the GeoNames `cities15000` dump downloaded on 2026-10-13.

- Source: [GeoNames](https://www.geonames.org/)
- Download format: [GeoNames export](https://download.geonames.org/export/dump/)
- License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)

Each bundled record retains its GeoNames identifier in `birthplaceData.ts` so values can be audited against the source. Coordinates represent the city record, not a hospital, street address, or the user's precise birthplace.

## Timezone behavior

The city record supplies an IANA timezone identity. It does not supply a fixed offset. Date-dependent UTC offsets, daylight-saving transitions, ambiguous times, and nonexistent local times are resolved at runtime by the browser's `Intl.DateTimeFormat` implementation of the [IANA Time Zone Database](https://www.iana.org/time-zones).

This separation is intentional:

- coordinates describe geographic position;
- an IANA identifier selects the applicable civil-time rule history;
- a UTC offset is calculated for a specific local date and time.

The application supports inputs from 1970 onward, matching the IANA database's reliable post-POSIX-epoch scope. A browser that lacks a requested zone rejects it rather than substituting the device timezone.

No birthplace data is fetched at runtime. An unlisted city must be entered through Advanced settings; EdenOS does not infer coordinates or timezone from the city name.
