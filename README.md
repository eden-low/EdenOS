# Eden OS

Eden OS is a private Personal OS for seeing the most important parts of the day and capturing trusted personal records without unnecessary complexity.

## Current scope: Exercise V1

The frontend runs locally against the configured Firebase project and includes:

- The approved EdenOS Design System v1
- A responsive Today dashboard
- A Records timeline with All, Expenses, and Exercise filters
- Quick Expense and manual Exercise capture with validation
- Draft review and editing before confirmation
- Editing and confirmed deletion of expense records
- Dashboard totals derived from confirmed expense records
- Separate expense and exercise domain models
- Silent Firebase Anonymous Authentication with browser-local session persistence
- Cloud Firestore as the authoritative source for confirmed expenses and exercises
- Realtime expense and exercise synchronization across Today and Records on the same Firebase user
- Firestore-backed expense creation, editing, and deletion
- Firestore-backed Exercise creation and reading, with distance stored in metres and duration stored in seconds
- Installable PWA manifest and EdenOS application icons
- Offline-capable application shell after one successful online load
- Shared online/offline status with guarded cloud mutations
- User-controlled service-worker update prompts

Text and Photo capture remain clearly marked as coming soon. Review, Settings, and all future Personal OS modules remain placeholders or backlog items.

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
|-- data/           Local seed data
|-- domain/         Expense labels and domain helpers
|-- pages/          Today and Records pages
|-- selectors/      Dashboard and timeline derivation
|-- repositories/   Data contract and Firestore expense implementation
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

Connectivity is observed once by the shared `ConnectivityProvider`. While EdenOS remains open, the last server-confirmed in-memory expense snapshot may remain visible offline alongside an offline indicator; it is not represented as current cloud data. A fully offline reopen can render the cached app shell, but cloud records remain unavailable if there is no in-memory snapshot.

Expense drafts may be prepared offline, but create, edit, and delete operations require connectivity and use Firestore transactions. Failed confirmations preserve the draft while the app remains active. There is no offline mutation queue, and drafts are not guaranteed to survive a full application termination yet.

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
4. Confirm that offline expense create, edit, and delete attempts show a retryable explanation without changing trusted records.
5. Restore the network and retry, verifying one Firestore record and one dashboard update.

Netlify serves `sw.js` and `manifest.webmanifest` with revalidation headers. Fingerprinted Vite assets can remain content-addressed and long-lived, while the service worker and manifest are checked for updates. Firebase requests are not added to Workbox runtime caches.

## Firebase architecture

```text
Firebase initialization
        |
anonymous auth observer
        |
authenticated UID
        |
React state/actions
        |
Separate Expense and Exercise repositories
        |
Cloud Firestore realtime subscription
```

Firebase is initialized once in `frontend/src/lib/firebase.ts` with the modular Web SDK. Authentication uses browser-local persistence, observes the existing session, and silently calls anonymous sign-in only when no user exists. There is no visible login experience.

Confirmed expenses are stored at:

```text
users/{uid}/expenses/{expenseId}
```

Confirmed exercises are stored at:

```text
users/{uid}/exercises/{exerciseId}
```

Exercise V1 supports realtime reading and idempotent manual creation. Distance is stored as optional integer metres and duration as integer seconds. Exercise editing and deletion are not implemented yet.

The domain-specific Firestore repositories own all SDK calls and map Firestore timestamps into ISO strings used by the existing domain models. UI components do not depend on Firestore document types. Drafts remain local and in memory; Firestore receives an expense or exercise only after confirmation.

Anonymous identity is specific to a browser profile and origin. Different browsers, cleared browser storage, and different devices will generally receive different anonymous users, so EdenOS does not yet provide cross-device account identity. A future phase may link an anonymous user to Google, but Phase 2B does not implement that.

## Firestore Security Rules

The prepared rules are in `firestore.rules`. They allow an authenticated user to access only their own expense and exercise collections, validate each domain separately, keep Exercise V1 update/delete access disabled, and deny every unrelated path by default.

Apply them manually in Firebase Console:

1. Open **Databases & Storage > Firestore > Rules**.
2. Replace the editor contents with `firestore.rules`.
3. Review the selected Firebase project and publish the rules.

The Firebase Web configuration is not a security boundary; UID ownership is enforced by these rules. Rules are not deployed automatically by this repository.

## Previous local persistence

Phase 2A used `localStorage` key `edenos.expenses.v1`. Phase 2B leaves that data untouched, does not read it as the active expense source, and never uploads or deletes it automatically. Manual migration may be considered later.

New anonymous users begin with empty Firestore expense and exercise collections. The weekly Exercise target and savings module remain local configuration, but demo records are never seeded into Firestore or mixed into Firebase-backed calculations.

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

Firestore offline synchronization remains future work. Phase 3 caches only the application shell and static assets.
