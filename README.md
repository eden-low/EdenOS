# Eden OS

Eden OS is a private Personal OS for seeing the most important parts of the day and capturing trusted personal records without unnecessary complexity.

## Current scope: Phase 2A

The app runs completely locally and includes:

- The approved EdenOS Design System v1
- A responsive Today dashboard
- A Records timeline with All, Expenses, and Exercise filters
- Quick Expense capture with validation
- Draft review and editing before confirmation
- Editing and confirmed deletion of expense records
- Dashboard totals derived from confirmed expense records
- Separate expense and exercise domain models
- Temporary local persistence for confirmed expenses

Text and Photo capture remain clearly marked as coming soon. Review, Settings, and all future Personal OS modules remain placeholders or backlog items.

## Repository structure

```text
/
|-- frontend/       React, TypeScript, Vite, and Tailwind application
|-- backend/        Reserved for a later backend phase
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
|-- services/       Temporary local record persistence
|-- state/          React Context and reducer state layer
`-- types/          Dashboard and record domain types
```

## Local development

Node.js 20.19+ or 22.12+ is required by Vite 8.

```bash
cd frontend
npm install
npm run dev
```

## Validation and production build

```bash
cd frontend
npm run lint
npm run build
```

The production output is generated in `frontend/dist/`.

## Temporary persistence

Confirmed expense records are stored behind `services/recordStorage.ts` using the versioned browser key `edenos.expenses.v1`. Missing, corrupted, or unavailable local storage falls back safely to the local seed records.

This is prototype-only persistence. UI components do not access localStorage directly, and the storage service is intended to be replaced by a future Supabase-backed record service.

Drafts remain in memory and are intentionally distinct from trusted records.

## Intentionally deferred

- Supabase, Firebase, authentication, and backend services
- AI, OCR, Text capture, and Photo capture
- Review page implementation
- PWA, IndexedDB, and offline financial storage
- Calendar and Today's Schedule
- Tasks, Playlist, Focus Timer, Habits, Deadlines, Notes, and Weather
- Income workflow and broader financial reporting

Calendar and Schedule, Tasks, and Playlist are approved backlog modules, but they come after the core finance workflow.
