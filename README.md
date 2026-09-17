# Eden OS

Eden OS is a private Personal OS for seeing the most important parts of the day and capturing trusted personal records without unnecessary complexity.

## Current staging scope

The frontend runs locally against the configured Firebase project and includes:

- The approved EdenOS Design System v1
- A responsive Today dashboard
- A Records timeline with All, Expenses, and Exercise filters
- Quick Expense and manual Exercise capture with validation
- Draft review and editing before confirmation
- Editing and confirmed deletion of expense and exercise records
- Dashboard totals derived from confirmed Firestore records
- Separate expense and exercise domain models
- Firebase Anonymous Authentication and optional Google account linking with browser-local session persistence
- Cloud Firestore as the authoritative source for confirmed expenses and exercises
- Realtime expense and exercise synchronization across Today and Records on the same Firebase user
- Firestore-backed expense creation, editing, and deletion
- Firestore-backed Exercise creation, reading, editing, and deletion, with distance stored in metres and duration stored in seconds
- Installable PWA manifest and EdenOS application icons
- Offline-capable application shell after one successful online load
- Shared online/offline status with guarded cloud mutations
- User-controlled service-worker update prompts

Text Capture is available. Photo capture and Review remain placeholders; future Personal OS modules remain backlog items.

## Repository structure

```text
/
|-- frontend/       React, TypeScript, Vite, and Tailwind application
|-- backend/        Reserved for a later backend phase
|-- firestore.rules  Firestore ownership and domain validation rules
|-- README.md
|-- .gitignore
`-- netlify.toml
```

Important frontend areas:

```text
frontend/src/
|-- components/     Shared EdenOS UI, capture, dashboard, layout, and record components
|-- data/           Preserved legacy local seed data (not an active data source)
|-- domain/         Expense labels and domain helpers
|-- pages/          Today and Records pages
|-- selectors/      Dashboard and timeline derivation
|-- repositories/   Domain repository contracts and Firestore implementations
|-- providers/      Shared browser connectivity state
|-- pwa/            Service-worker registration and update lifecycle
|-- services/       Preserved legacy local-storage abstraction
|-- state/          React Context and reducer state layer
`-- types/          Dashboard and record domain types
```

## Local development

Node.js 20.19+ or 22.12+ is required by Vite 8.

Before running with cloud data, configure the Firebase project:

1. Register a Firebase Web App and copy its Web App configuration values.
2. Open **Security > Authentication > Sign-in method** and enable **Anonymous**. Leave automatic anonymous-user cleanup disabled if the browser identity and its data must remain accessible beyond 30 days.
3. Open **Databases & Storage > Firestore**, create the default database, and choose the intended long-term database location carefully.
4. Publish the repository rules as described under **Firestore Security Rules** below.

```bash
cd frontend
npm install
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` and provide the Firebase Web App configuration:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`frontend/.env.local` is ignored by Git. Restart the Vite development server after changing it. EdenOS validates every required variable at startup and shows a configuration message instead of silently selecting a project. Configuration values are never logged by the app.

For Netlify, add the same six variables under **Site configuration > Environment variables**. Do not commit real Firebase configuration to this repository.

## Validation and production build

```bash
cd frontend
npm run lint
npm run build
```

The production output is generated in `frontend/dist/`.

## PWA status

EdenOS is installable with a standalone manifest, dark EdenOS theme colors, and original 192px, 512px, maskable, and Apple touch icons. The icon source is `frontend/public/icons/edenos-icon.svg`; regenerate its raster assets with:

```bash
cd frontend
npm run generate:pwa-assets
```

`vite-plugin-pwa` generates the service worker during production builds. It precaches the HTML shell, fingerprinted JavaScript and CSS, and local static assets. Navigation falls back to the cached application shell after a successful online load. No runtime caching rule intercepts Firebase Authentication or Firestore traffic, and Firestore offline persistence is not enabled.

Connectivity is observed once by the shared `ConnectivityProvider`. While EdenOS remains open, the last server-confirmed in-memory expense and exercise snapshots may remain visible offline alongside an offline indicator; they are not represented as current cloud data. A fully offline reopen can render the cached app shell, but cloud records remain unavailable if there is no in-memory snapshot.

Expense and exercise drafts may be prepared offline, but create, edit, and delete operations require connectivity and use Firestore transactions. Failed confirmations preserve the active draft for retry; closing Capture requires explicitly discarding unconfirmed work. There is no offline mutation queue or persistent draft storage.

Service-worker updates use a prompt. EdenOS never force-refreshes automatically. If an unconfirmed draft exists, the user must explicitly acknowledge that updating will discard it before the new version is activated and the page reloads. Dismissing the prompt suppresses it for the current session.

PWA installation does not change Firebase identity semantics. Anonymous identity remains tied to a browser profile and origin; installing EdenOS on another device does not share the desktop browser's UID.

### Production PWA testing

Service workers are disabled during normal Vite development. Test the generated production behavior on localhost, which browsers treat as a secure context:

```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1
```

In browser developer tools:

1. Open **Application > Manifest** and verify the standalone manifest and icons.
2. Open **Application > Service Workers** and verify `sw.js` is activated and controls the page.
3. Load EdenOS online once, switch the browser network to Offline, then reload and verify the EdenOS shell appears.
4. Confirm that offline expense and exercise create, edit, and delete attempts show a retryable explanation without changing trusted records.
5. Restore the network and retry, verifying one Firestore record and one dashboard update.

Netlify serves `sw.js` and `manifest.webmanifest` with revalidation headers. Fingerprinted Vite assets can remain content-addressed and long-lived, while the service worker and manifest are checked for updates. Firebase requests are not added to Workbox runtime caches.

## Firebase architecture

```text
Firebase initialization
        |
browser-local auth session restoration
        |
existing user or explicit guest / Google choice
        |
authenticated UID
        |
React state/actions
        |
Separate Expense and Exercise repositories
        |
Cloud Firestore realtime subscription
```

Firebase is initialized once in `frontend/src/lib/firebase.ts` with the modular Web SDK. Authentication uses browser-local persistence and waits for session restoration before showing the app or an account choice. When no session exists, the user can continue anonymously or sign in with Google. An existing guest can connect Google through Account; the SDK links the Google provider to the current Firebase user, retaining the UID. Only a connected Google user can sign out. Signing out returns to the account choice without automatically creating a new guest.

Confirmed expenses are stored at:

```text
users/{uid}/expenses/{expenseId}
```

Confirmed exercises are stored at:

```text
users/{uid}/exercises/{exerciseId}
```

Exercise V1.1 supports realtime reading, idempotent manual creation, editing, and confirmed deletion. Distance is stored as optional integer metres and duration as integer seconds. Exercise mutations preserve `createdAt`, update `updatedAt` with a server timestamp, and flow back into the UI through server-confirmed realtime snapshots.

The domain-specific Firestore repositories own all SDK calls and map Firestore timestamps into ISO strings used by the existing domain models. UI components do not depend on Firestore document types. Drafts remain local and in memory; Firestore receives an expense or exercise only after confirmation.

Anonymous identity is specific to a browser profile and origin. Linking Google upgrades that same Firebase user so another device can sign in to its UID and read the existing collections. Conflicting Google accounts are not merged or migrated.

To enable Google sign-in, open **Firebase Console > Authentication > Sign-in method > Google**, enable the provider, and configure its required support email. In **Authentication > Settings > Authorized domains**, include each domain that serves EdenOS. Anonymous sign-in remains enabled for guests. Local development may require explicitly authorizing `localhost`.

## Firestore Security Rules

The prepared rules are in `firestore.rules`. They allow an authenticated user to access only their own expense and exercise collections, validate each domain separately, preserve `createdAt` on updates, and deny every unrelated path by default.

Rules are deployed automatically when relevant rule or Firebase configuration files change on `main`, using `.github/workflows/deploy-firestore-rules.yml` and the `FIREBASE_SERVICE_ACCOUNT` repository secret. To apply them manually in Firebase Console instead:

1. Open **Databases & Storage > Firestore > Rules**.
2. Replace the editor contents with `firestore.rules`.
3. Review the selected Firebase project and publish the rules.

The Firebase Web configuration is not a security boundary; UID ownership is enforced by these rules.

## Previous local persistence

Phase 2A used `localStorage` key `edenos.expenses.v1`. Phase 2B leaves that data untouched, does not read it as the active expense source, and never uploads or deletes it automatically. Manual migration may be considered later.

New anonymous users begin with empty Firestore expense and exercise collections. Today shows real Firestore-derived spending and exercise activity, while unconfigured budget, savings-goal, and exercise-target values remain neutral rather than displaying demo data. Demo records are never seeded into Firestore or mixed into Firebase-backed calculations.

## Intentionally deferred

- Google/email login, account management, and cross-device identity
- Firebase Storage, Cloud Functions, and custom backend services
- AI, OCR, Text capture, and Photo capture
- Review page implementation
- IndexedDB, Firestore offline persistence, and offline mutation synchronization
- Calendar and Today's Schedule
- Tasks, Playlist, Focus Timer, Habits, Deadlines, Notes, and Weather
- Income workflow and broader financial reporting

Calendar and Schedule, Tasks, and Playlist are approved backlog modules, but they come after the core finance workflow.

Firestore offline synchronization remains future work. The current PWA caches only the application shell and static assets.
