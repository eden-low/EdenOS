# Mobile image paste and foreign currency: Staging acceptance

Scope: the three existing image inputs and pre-confirmation MYR conversion.
No new pages, OCR prompt/model/key changes, record schema changes, migrations,
rules changes or production deployments.

## Implementation

- Receipt, Fitness Screenshot and Batch Screenshot share `useImagePaste`.
  Clipboard reads occur only in the button click. Safari's native Paste approval
  is allowed to run; no unsupported `clipboard-read` permissions query is used.
- Keyboard paste and image upload remain available. Clipboard images must pass
  the existing MIME/size/compression pipeline and decode successfully. SVG, text,
  corrupt images, empty items and denied/cancelled reads produce upload guidance.
- Blobs stay in component memory. Preview/decoder object URLs are revoked on
  replacement, removal, navigation or unmount. Generation checks and aborts
  prevent late reads, image preparation or OCR from replacing newer work.
- Expense and editable Batch rows use one currency conversion control. Explicit
  codes and unambiguous symbols can preselect currency. Bare `$` / `¥`, conflicting
  codes and unknown screenshot currencies require a choice. No locale/GPS inference.
- Receipt currency hints come from the existing `amountEvidence` only. Existing
  OCR instructions, extraction validation rules and model routing are unchanged.
  Foreign original amounts use that evidence, never an OCR-generated MYR conversion.
  If evidence is insufficient, the user supplies currency and original amount.
- Existing Batch OCR `amountSen` is interpreted as the source currency's minor
  units (JPY/KRW have zero decimal places). Optional conversion fields are draft
  state only; legacy candidates without these fields continue as MYR.
- Calculations use integer rational arithmetic and round half-up once to MYR sen.
  Source amount, currency, rate, publication date and suggested MYR are visible.
  Actual bank MYR overrides the suggestion, including during an API outage.
- The existing Review/Confirm writers receive only the final integer `amountSen`
  and existing record fields. No foreign metadata is persisted or added to Notes.
  Reopening confirmed records starts from their saved MYR value and never fetches FX.

## Exchange rate contract

Source: [Frankfurter v2](https://frankfurter.dev/), blended daily reference rates
from central banks and official sources. [Browser/CORS documentation](https://frankfurter.dev/javascript/).
Public endpoint: `https://api.frankfurter.dev/v2/rate/{currency}/MYR` with optional
`date=YYYY-MM-DD`. No key or daily/monthly quota; abuse rate limits still apply.
Sources generally publish once or a few times daily, with API updates throughout
the day. Rates exclude bank fees and are suggestions, not live executable quotes.

The app checks pair identity, finite positive numeric rates, real dates, no future
publication and at most seven days between requested/publication date. Weekends
and short holidays can therefore use the visibly dated last available rate.
Older or unavailable results cannot silently supply an amount. Historic dates
are compared with their requested date, not with today. Malaysia's early morning
can be one calendar day ahead of UTC; in that case requests use the latest UTC
day and display the actual publication date. Future consumption dates require
latest-rate selection or manual MYR entry.

Only currency/date go to the API. No amount, receipt or transaction text is sent;
credentials and referrer are omitted. Valid rates have a bounded, one-hour,
memory-only cache with concurrent-request deduplication and a ten-second timeout.
No background refresh or post-confirmation recalculation is introduced.

Live read-only contract checks returned HTTP 200 and `Access-Control-Allow-Origin: *`
for the latest pair, a historical pair and currency directory. MYR, USD, SGD, JPY,
EUR and GBP were present. Automated tests mock the API.

## iPhone manual acceptance (Safari and installed PWA)

Use only a synthetic receipt/workout/transaction screenshot. Open
[Staging](https://staging--edenos.netlify.app) and refresh/update the installed PWA.

1. Copy a synthetic screenshot. In Capture → Receipt tap **Paste Image / 粘贴图片**.
   If iOS shows its native Paste menu or permission sheet, explicitly allow it.
   Verify a preview appears without starting OCR; Continue remains a separate step.
2. Repeat in Capture → Fitness Screenshot and Finance → Batch Import → Screenshot.
   On desktop, verify Ctrl+V/Cmd+V. Also verify Choose Image still opens Photos/files.
3. Deny/cancel paste, copy text, and copy unsupported content. Verify the message
   explains upload fallback. No draft or OCR should be submitted automatically.
4. Replace/remove the image, then back out or close. Reopen and verify no old image
   returns. Cancel a native paste prompt or replace via upload while it is pending.
5. In Manual Expense enter `USD 25`, choose a valid date, and check the visible
   source amount, reference date/rate and MYR suggestion. The mock test rate of
   4.5 yields RM112.50; live rates will differ.
6. Change consumption date and compare historical/latest options. Enter an actual
   bank MYR amount and ensure review uses that amount. Turn off networking and
   verify manual MYR entry remains possible without a reference rate.
7. Use a synthetic receipt with unclear currency. Choose its currency manually.
   In Batch text try `2026-09-17 Coffee -USD 25` and
   `2026-09-17 Books -SGD 10` on separate lines; check independent conversions.
8. Review the resulting MYR amount, then cancel without confirming during smoke
   testing. Use a designated test account if persistence acceptance is needed.

Native iOS Safari/PWA clipboard approval, image availability from individual source
apps and OS-version differences require a physical iPhone. WebKit can reject a
read when its native Paste UI is dismissed or Safari loses focus. The app cannot
bypass this, and upload remains the reliable fallback. Chromium mobile emulation
checks layout and mocked interactions only, not Apple's permission UI.

## Validation and release

Local validation passed: 1,081 Vitest tests across 162 files, TypeScript, lint
(no diagnostics), production build and PWA generation. Twenty Chromium mobile
emulation checks passed across the four widths below.
The PR adds a staging-only CI workflow for these checks. Browser smoke checks use
synthetic data and mocked rates at 320, 375, 390 and 430 CSS pixels; they cover all
three image entries, Manual Expense and multi-currency Batch review. The temporary
browser harness stays outside the committed application. No real-data writes or
live OCR calls are used for smoke testing.
