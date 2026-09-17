# Backend

Broader backend and API functionality is deferred to a later phase.

The current frontend uses domain-specific repositories to read and write authenticated user records directly in Cloud Firestore. Firestore realtime snapshots are authoritative for confirmed Expense and Exercise records; this directory contains no active server implementation.

This directory remains reserved. Receipt OCR V1 uses a small Netlify Function under `frontend/netlify/functions/`; it does not use this directory or change Firestore repository ownership.
