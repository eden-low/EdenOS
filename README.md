# Eden OS

Eden OS is a private Personal OS for seeing the most important parts of the day and capturing trusted personal records without unnecessary complexity.

## Current scope: Phase 2B

The app runs completely locally and includes:

- The approved EdenOS Design System v1
- A responsive Today dashboard
- A Records timeline with All, Expenses, and Exercise filters
- Quick Expense capture with validation
- Draft review and editing before confirmation
- Editing and confirmed deletion of expense records
- Dashboard totals derived from confirmed expense records
- Separate expense and exercise domain models
- Silent Firebase Anonymous Authentication with browser-local session persistence
- Cloud Firestore as the authoritative source for confirmed expenses
- Realtime expense synchronization across Today and Records on the same Firebase user
- Firestore-backed expense creation, editing, and deletion

Text and Photo capture remain clearly marked as coming soon. Review, Settings, and all future Personal OS modules remain placeholders or backlog items.

## Repository structure

```text
/
|-- frontend/       React, TypeScript, Vite, and Tailwind application
|-- backend/        Reserved for a later backend phase
|-- firestore.rules  Firestore ownership and expense validation rules
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
ExpenseRepository
        |
Cloud Firestore realtime subscription
```

Firebase is initialized once in `frontend/src/lib/firebase.ts` with the modular Web SDK. Authentication uses browser-local persistence, observes the existing session, and silently calls anonymous sign-in only when no user exists. There is no visible login experience.

Confirmed expenses are stored at:

```text
users/{uid}/expenses/{expenseId}
```

The Firestore repository owns all SDK calls and maps Firestore timestamps into ISO strings used by the existing domain model. UI components do not depend on Firestore document types. Drafts remain local and in memory; Firestore receives an expense only after confirmation.

Anonymous identity is specific to a browser profile and origin. Different browsers, cleared browser storage, and different devices will generally receive different anonymous users, so EdenOS does not yet provide cross-device account identity. A future phase may link an anonymous user to Google, but Phase 2B does not implement that.

## Firestore Security Rules

The prepared rules are in `firestore.rules`. They allow an authenticated user to access only `users/{theirUid}/expenses/*`, validate the current expense fields, preserve `createdAt` during updates, and deny every unrelated path by default.

Apply them manually in Firebase Console:

1. Open **Databases & Storage > Firestore > Rules**.
2. Replace the editor contents with `firestore.rules`.
3. Review the selected Firebase project and publish the rules.

The Firebase Web configuration is not a security boundary; UID ownership is enforced by these rules. Rules are not deployed automatically by this repository.

## Previous local persistence

Phase 2A used `localStorage` key `edenos.expenses.v1`. Phase 2B leaves that data untouched, does not read it as the active expense source, and never uploads or deletes it automatically. Manual migration may be considered later.

New anonymous users begin with an empty Firestore expense collection. Mock exercise and savings modules remain local, but demo expenses are never seeded into Firestore or mixed into Firebase-backed calculations.

## Intentionally deferred

- Google/email login, account management, and cross-device identity
- Firebase Storage, Cloud Functions, and custom backend services
- AI, OCR, Text capture, and Photo capture
- Review page implementation
- PWA, IndexedDB, and offline financial storage
- Calendar and Today's Schedule
- Tasks, Playlist, Focus Timer, Habits, Deadlines, Notes, and Weather
- Income workflow and broader financial reporting

Calendar and Schedule, Tasks, and Playlist are approved backlog modules, but they come after the core finance workflow.

PWA and Firestore offline synchronization remain future work. The current client-side repository boundary is compatible with a later Vite PWA phase without enabling offline persistence now.
