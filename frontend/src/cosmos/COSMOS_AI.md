# Cosmos Phase 5 — Ask Cosmos architecture and privacy

## Scope

Ask Cosmos is an optional, session-only interpretation layer over the five existing deterministic local systems: Tarot, I Ching, BaZi, Western Astrology, and Zi Wei Dou Shu. It also provides chart-independent dream reflection. It never replaces, changes, or invokes the local calculation engines on the server. Huangli, forecasts, auspicious-date selection, and automatic daily AI readings are out of scope.

Data flow:

`local calculation → typed React-memory snapshot → user selection → visible preview and consent → authenticated owner-only Netlify Function → Gemini → server-validated JSON → React-memory display`

There are no Firebase, Firestore, Cloud Storage, localStorage, sessionStorage, IndexedDB, cookie, or server-database writes in this flow. Reloading or discarding the Cosmos page clears all snapshots, requests, and responses.

## Prompt and model

- Prompt version: `cosmos-v1`, exported as `COSMOS_PROMPT_VERSION` in `server/cosmosPrompt.ts`.
- Default model: `gemini-2.5-flash`, chosen for responsive, cost-efficient structured text output.
- Optional server override: `COSMOS_GEMINI_MODEL`, validated against a restricted Gemini model-name pattern. Do not use an unpinned `latest` alias.
- Provider: the existing server-only `@google/genai` dependency and `GEMINI_API_KEY` pattern.
- Maximum output: 3,000 tokens; HTTP timeout: 20 seconds; SDK retries: one total attempt (no automatic retry).

The prompt treats local results as factual computed input and traditional interpretation as tentative symbolism. It forbids invented chart objects, forced agreement, fake quotations, deterministic predictions, hidden-thought claims, diagnosis, and medical/legal/investment directives. Cross-system results must preserve source attribution and differences. Dream responses must include alternatives and cannot claim objective prediction or supernatural proof.

## Authorization and server configuration

Endpoint: `POST /.netlify/functions/cosmos-reading`

Required server-only variables:

1. `EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON` — existing Firebase Admin service account JSON for ID-token verification.
2. `GEMINI_API_KEY` — existing Gemini API credential.
3. `COSMOS_AUTHORIZED_FIREBASE_UIDS` — comma-separated Firebase UIDs allowed to use this billed personal endpoint.
4. Optional `COSMOS_GEMINI_MODEL` — defaults to `gemini-2.5-flash`.

The endpoint fails closed if the owner allowlist is absent. A valid Firebase token is not sufficient: its verified UID must also appear in the server-only allowlist. UIDs, credentials, and provider configuration are never hardcoded or sent to the client. Anonymous or other authenticated users receive `403 forbidden`; invalid or absent tokens receive `401 auth`.

The endpoint accepts JSON only, rejects non-POST methods, caps the encoded body at 48 KiB, uses `Cache-Control: no-store`, validates every request field and every model response field, and never logs questions, dream text, chart context, or Gemini output. Browser responses contain stable error codes rather than provider stack traces.

## Request schema and minimization

Requests use schema version `1` and include:

- `promptVersion`: `cosmos-v1`.
- `mode`: `single`, `cross`, or `dream`.
- a bounded question; dream mode additionally has bounded dream text.
- zero to five validated, unique symbolic sources according to mode.
- a coarse birth-input compatibility status and explicit mismatch acknowledgement.
- explicit per-request consent.

Only derived symbolic facts are serialized. The request schema rejects extra fields, including the local-only `subject` comparison object. Names, email addresses, raw birth dates/times, birthplace text, city, coordinates, profile data, and Firebase identifiers are not part of the AI request.

The five snapshot shapes contain:

- Tarot: chosen cards, spread positions, deck positions, stable card IDs, and orientations.
- I Ching: six verified line values, primary/relating hexagrams and trigrams, moving lines, and the bundled reference text.
- BaZi: available pillars, Day Master, visible-element counts, Ten Gods, conventions, and uncertainty notes.
- Astrology: exact or date-only planetary placements, available houses/angles, aspects, conventions, and uncertainty notes.
- Zi Wei: twelve palace identities, Life/Body Palace, major stars, Four Transformations, Five Elements Bureau, and conventions.

Each module invalidates its snapshot when relevant inputs change or a reading is reset. Switching tabs preserves a completed snapshot in the parent `CosmosPage` React state; unvisited systems never receive fabricated results.

## Birth-context compatibility

Raw birth inputs stay in a local-only `subject` object used solely to compare date, time-known state, local civil time, and timezone. That object is explicitly removed before request construction and rejected by the server if injected.

When two or more natal systems have different inputs, or have unknown times that prevent a confident match, Ask Cosmos shows a warning and requires a second explicit acknowledgement. Even compatible input labels do not normalize the systems: BaZi's Malaysia UTC+08 and 00:00 day boundary, Western Astrology's IANA/DST and partial-chart behavior, and Zi Wei's lunar-year/late-Zi conventions remain separate and are included as source labels.

## Response schema and rendering

Gemini returns structured JSON with:

- overall reflection;
- source-attributed observations;
- cross-system shared themes and differences only in cross mode;
- dream themes, associations, and alternatives only in dream mode;
- alternative interpretations;
- exactly three reflective questions;
- limitations/disclaimer.

The function bounds string lengths and arrays, rejects unknown source identifiers and observations attributed to unselected sources, and rejects malformed or mode-incompatible sections. React renders plain text elements only; no raw HTML or `dangerouslySetInnerHTML` is used.

## Failure behavior and user control

The browser prevents concurrent duplicate generation, cancels obsolete UI requests on unmount or mode change, and ignores stale responses. Cancellation does not guarantee cancellation of provider billing, which is why the generate button is disabled while a request is active. There are no automatic retries. Errors distinguish authentication, owner authorization, configuration, quota/rate limits, timeout, network failure, malformed output, and temporary provider failure. A failed request never removes any local reading.

The service worker precaches only static HTML/JS/CSS assets. It has no runtime caching rule for the POST endpoint, and the request and response both use `no-store`.

## Local tests

Normal automated tests mock Gemini and never incur API charges:

```sh
npm run test
npm run lint
npx tsc -p tsconfig.functions.json --noEmit
npm run build
```

Use Netlify Dev only when manually exercising the function. Configure synthetic credentials and safe synthetic chart data; never commit `.env` files, UIDs, keys, service-account JSON, or real birth details. A live smoke test must be separately deliberate because it can consume Gemini quota.

## Known limitations

- No chat history or follow-up transcript is persisted.
- Dream mode does not combine natal data in Phase 5.
- Input compatibility checks exact local civil inputs; they do not prove that charts refer to the same person.
- Provider-side processing and retention follow the applicable Google Gemini API terms and configuration; EdenOS cannot promise zero provider retention.
- AI interpretation can be wrong even when source data is correct and remains a reflective aid, not evidence or professional advice.
