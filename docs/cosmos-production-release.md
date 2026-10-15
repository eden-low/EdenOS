# Cosmos Production release and rollback runbook

This runbook prepares a controlled, approval-gated release of the Cosmos phases currently accepted on Staging. It does not authorize a Production configuration change, `main` update, deployment, or Gemini request by itself.

## Stop conditions

Stop before release if any of the following is true:

- the intended Production Google-connected Firebase UID is missing or ambiguous;
- any required Production Function variable is absent or resolves in an unintended deploy context;
- a temporary authorization diagnostic endpoint, UI, build script, or client service remains;
- an authentication, authorization, privacy, PWA, test, build, or packaging check fails;
- the release contains a Firebase/Firestore migration, rule change, destructive data path, or unexplained Git difference;
- the expected `main`, Staging, or release-candidate commit changed without review.

## Production configuration checklist

The owner performs these checks in Netlify without sharing values in logs or chat:

- Confirm the intended Production account says **Google connected**. Copy its Firebase UID locally and compare it privately with the intended allowlist entry.
- In the **Production** deploy context, set `COSMOS_AUTHORIZED_FIREBASE_UIDS` to the approved UID list.
- In the **Production** deploy context, set `COSMOS_GEMINI_MODEL` to `gemini-3.1-flash-lite`.
- Confirm Production Functions can access non-empty `GEMINI_API_KEY` and `EDENOS_GOOGLE_SERVICE_ACCOUNT_JSON` values.
- Do not rotate either shared credential during this release. `GEMINI_API_KEY` is also used by receipt/screenshot extraction; the Firebase Admin credential is used by authenticated server Functions.
- Confirm the Staging branch-specific values remain unchanged.
- Resolve the same variables for Production, `branch:staging`, and one unrelated branch context. Report only Boolean presence, context/scope, and the safe model identifier. The owner allowlist must not be inherited by an unapproved branch deploy.
- Confirm no credential or UID uses a `VITE_` prefix and none appears in the browser bundle.

## Final Staging release-candidate validation

This step requires separate authorization to push/deploy Staging.

1. Fetch `origin/main` and `origin/staging`; verify both expected commit IDs and a clean release-candidate worktree.
2. Inspect `git diff --check`, `git diff --stat origin/main...<release-candidate>`, and every changed path. Confirm there are no Firebase rule/schema changes, migrations, secrets, diagnostic artifacts, or unrelated destructive changes.
3. Run the full Vitest suite, lint, all TypeScript project references, Vite/PWA build, Netlify Function build, browser secret/SDK scans, and focused authorization/Cosmos/regression tests using mocks only.
4. Push the reviewed release candidate to `staging` once, wait for Netlify Ready, and confirm the deployed commit.
5. Verify `/`, `/cosmos`, `/sw.js`, PWA update behavior, all five local systems, account continuity, Capture/Apple upload deduplication, Expenses/Records/Dashboard, and local-device Privacy Lock.
6. Verify `/.netlify/functions/cosmos-auth-diagnostic` is absent and `cosmos-reading` rejects missing, invalid, anonymous, and nonallowlisted identities.
7. Do not make a billed Gemini request during automated validation.

## Production release

Each approval below is a separate gate.

1. Obtain owner confirmation that the Production UID and all four effective Production variables have been verified privately.
2. Obtain explicit approval before changing any Production environment variable. Apply only the approved Production-context values and verify them using sanitized presence/context checks.
3. Re-run the release-candidate validation if a configuration or code change was needed.
4. Obtain explicit final approval to update `main` and deploy Production.
5. Fetch remotes and verify `origin/main` is still the reviewed base. Confirm `git merge-base --is-ancestor origin/main <release-candidate>` succeeds.
6. Update a local `main` with `git merge --ff-only <release-candidate>`. Push with a normal `git push origin main:main`; never force-push.
7. Wait for the matching Netlify Production deploy to reach Ready and verify its commit and Function inventory.
8. Before signing in, verify `/`, `/cosmos`, `/sw.js`, manifest/PWA assets, and unauthenticated/invalid-token `cosmos-reading` rejection with `Cache-Control: no-store`. Confirm the diagnostic endpoint is absent.
9. On iPhone and desktop, verify the same account/data continuity, Expenses and Records, Dashboard, Capture/Apple upload deduplication, Privacy Lock on each local device, and the unchanged **Update now** behavior.
10. After explicit per-request owner consent, perform exactly one synthetic dream interpretation containing no real personal information. Confirm the structured result and clear it from memory.
11. Record the Production deploy ID, commit, sanitized configuration results, route/security checks, PWA status, and smoke-test outcome. Stop; do not perform additional paid requests.

## Rollback

1. For a critical regression, immediately publish the previous known-good Netlify Production deploy through Netlify's rollback/publish control. Do not alter Firebase data or rules.
2. If the fault is configuration-only, restore the last known-good Production-context value through the approved Netlify process, verify only sanitized presence/context metadata, and redeploy the reviewed commit.
3. Preserve Git history. Do not reset or force-push `main`. Create a rollback branch from current `origin/main`, revert the release range with `git revert`, validate it fully, obtain approval, and push the revert commit normally.
4. Verify the rollback routes, service worker/update flow, account/data continuity, Privacy Lock, upload deduplication, receipt OCR, and Cosmos authorization boundary. Do not invoke Gemini unless separately approved.
5. Document whether the deployed rollback and `main` temporarily differ, then reconcile them with reviewed commits rather than rewriting history.

This release introduces no Firebase or Firestore data migration. Cosmos snapshots and AI responses remain session-only; Privacy Lock PIN material remains local-device storage and must not be migrated or synchronized.
