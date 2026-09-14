# Backend

Backend, server, and API functionality is intentionally deferred to a later phase.

The current frontend uses domain-specific repositories to read and write authenticated user records directly in Cloud Firestore. Firestore realtime snapshots are authoritative for confirmed Expense and Exercise records; this directory contains no active server implementation.

This directory remains reserved so any future server-side work stays separate from the Vite application in `frontend/`. No backend API, Cloud Functions, or server process is required by the current staging build.
