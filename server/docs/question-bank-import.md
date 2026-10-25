# Samkaro question bank import

## Source audit

The preserved source bank is recursively read from `web/questions/`; the current discovered file is `web/questions/trivia_clean.json`. It contains 171 records in `clean` and 29 records in `removed` (200 total, matching the embedded source statistics). Candidate fields are `id`, `q`, numeric `answer`, `unit`, `type`, `category`, `difficulty`, `topic`, numeric `confidence`, and string `source_hint`. The `removed` collection contains `id`, `q`, and `reason` only.

The source has two categories (`كرة القدم`, `مسلسلات`), four source types (`year`, `count`, `measure`, `money_or_large`), and two difficulty values (`medium`, `hard`). Every clean record has a stable ID and the observed required metadata. The 171 `answer` fields are JSON numbers: 169 integers and two decimals. The existing game uses PostgreSQL `BigInt` and safe integer guesses, so those two decimals are rejected without rounding. No clean record contains an approved player hint. `source_hint` is retained as a source note and is not a game hint. No answer has been independently fact-checked.

Current validation counts: 169 normalized records, 0 playable records, 171 records missing approved hints, 2 rejected records, 0 duplicate IDs, 0 exact duplicate prompts, and 14 near-duplicate pairs for manual review. The database importer has not been run; the report records that database import is not run.

## Normalization

The importer preserves IDs, Arabic prompt text, integer answers, category, difficulty, source notes, and traceable file/collection/record-index provenance. `year` maps to the game type `year`; `count`, `measure`, and `money_or_large` map to the supported game type `number`. The original type, unit, topic, confidence, and source note are retained in the question `metadata` JSON column. `source_hint` is copied into the existing `source` field as well.

Only unambiguous non-negative safe integers can enter the current model. Arabic-Indic and Persian digits, Arabic decimal/thousands marks, and clearly grouped spaces are recognized by the validator; ambiguous punctuation such as `1,234` or `1.234` is rejected instead of guessed. Decimal values are reported and excluded until numeric persistence and scoring are intentionally upgraded.

The importer only considers normalized integer records whose hint-review row has `status: "approved"`, `reviewerDecision: "approved"`, and `approved: true`; a matching SHA-256 fingerprint of the complete source record and provenance; `factCheckStatus: "verified"` with at least one HTTPS source and a fact-check note; `leakageReview: "clear"`; an approval note; and non-empty `gameplayHint.range`, `gameplayHint.accuracy`, and `gameplayHint.note`. It writes those fields as an approved `ApprovedQuestionHint`; it never treats a proposed `suggestion` or source `source_hint` as an approved game hint. A question is enabled only when that complete, current approval passes validation. Pending or rejected source records are skipped, and previously imported source-owned rows without current explicit approval are disabled and their stored hint approval is revoked. With the current artifact, no hints are approved, so no question records are imported and the playable count remains zero.

## Duplicate policy

- Stable IDs are the database key. A duplicate candidate ID blocks the import before any database writes; the importer never chooses one copy silently.
- Exact normalized prompt duplicates are reported and preserved, not merged.
- Near-duplicate pairs are reported by a deterministic small edit-distance check for human review; the check does not discard records.
- Database records with the same ID but a different `sourceFile` are treated as owned by another source and block the complete transaction.
- Re-importing an unchanged source-owned record skips it. Changed source content updates that record. If prompt, answer, or game type changes, the record is disabled and any existing hint approval is revoked so it must be reviewed again. Hint text itself is preserved.
- Database writes run in one serializable transaction. Validation, duplicate-ID, and ownership conflicts are checked before writes; a failure rolls back the transaction.

## Reports and artifacts

`npm run questions:validate` reads every recursive JSON file and writes:

- `server/data/question-bank.normalized.json`: safely normalized answer data for server-side use only.
- `server/reports/question-bank-report.json`: machine-readable record-level issues and counts.
- `server/reports/question-bank-report.md`: human-readable quality summary.
- `server/reports/question-bank-review.json` and `.md`: record-by-record review of every clean candidate, including all 14 near-duplicate pairs.
- `server/data/question-bank-hints.review.json` and `server/reports/question-bank-hints.review.md`: one editor assessment per valid integer candidate, including the original question and answer, draft hint, leakage and usefulness assessment, fact-check state, recommendation, explicit human decision fields, and source fingerprint.

The import command updates those reports with inserted, updated, skipped, and rejected database counts. The reports and normalized artifact are generated locally and are not referenced by the Vite frontend. Do not copy them into `web/public` or import them from browser code.

## Setup and commands

Prerequisites: Node.js 20.19+, installed server dependencies, a reachable PostgreSQL database, and Prisma Client generated from the current schema. Copy `server/.env.example` to `server/.env` only if one does not already exist; set `DATABASE_URL` for the development database. Apply migrations before importing:

```powershell
Set-Location server
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run questions:validate
npm.cmd run questions:import
```

`questions:validate` exits with status 2 for invalid JSON roots or conflicting stable IDs while still writing reports and safe artifacts. Records safely excluded by the current answer policy, such as unsupported decimals, remain visible in the report but do not fail validation. The current app has no admin review UI. Review `server/data/question-bank-hints.review.json` as a controlled editorial artifact. For each accepted hint, a human must fact-check the answer, put reliable HTTPS links in `factCheckSources`, set `factCheckStatus` to `verified`, add `factCheckNote`, edit the three `gameplayHint` values, set `leakageReview` to `clear` only after checking the final player-facing text, set `reviewerDecision` and `status` to `approved`, set `approved` to `true`, and add an `approvalNote`. `reviewerNotes` are optional. To reject a hint, set `reviewerDecision` and `status` to `rejected`, keep `approved` false, and record the reason in `reviewerNotes` or `approvalNote`. Recommendations are not approvals. The fingerprint covers the complete original source record plus file, collection, and record index; any source change resets the review to a pending revision and makes a stale approval fail import. Validation preserves decisions only when this fingerprint matches. `questions:import` considers only explicitly approved, fact-checked records with complete valid hints; only those records are enabled for gameplay. Proposed, needs-revision, needs-fact-check, rejected, stale, unverified, and incomplete hint rows are never imported; previously imported source-owned records that no longer have valid explicit approval are disabled and their hint approval revoked. Invalid JSON roots and candidate duplicate IDs block all database writes. Set `SAMKARO_QUESTION_SOURCE_DIR` to inspect an alternate versioned source directory; provenance is recorded relative to the repository when possible.

`npm run db:seed` remains a separate development-only command for disabled, unverified examples. It does not read, overwrite, or replace this bank.

## Adding and reviewing records

Use the source record shape with a stable ID, Arabic `q`, numeric `answer`, `category`, and one supported `type`; retain any available `unit`, `difficulty`, `topic`, `confidence`, and `source_hint`. The current import is intentionally stricter than the metadata parser: accepted database answers must be non-negative safe integers. Review every reported answer with reliable sources before enabling competitive play. Never use confidence metadata as factual verification.

For every question intended for play, fact-check the answer with reliable sources, rewrite the hint where recommended, review the final Arabic text for helpfulness and answer leakage, decide duplicate pairs, and complete the explicit approval fields above. The current app has no admin panel or public hint-editing endpoint; make decisions through the controlled review artifact and importer. Review each record individually. Keep source versions and rejected-record decisions auditable. A Codex recommendation is editorial guidance only and is never an approval.

## Frontend exposure

The source remains at the requested `web/questions/` path, but Vite's production build does not copy it because it is outside `public/` and is not imported by frontend source. The Vite dev server also denies paths matching `**/questions/**`. The normalized answer artifact and reports are under `server/`, outside the Vite root and outside the production frontend bundle. These boundaries must be rechecked if Vite's `publicDir`, aliases, or build inputs change.

## Verification status for this checkout

The recursive source audit and `npm.cmd run questions:validate` completed successfully on Node.js 24.21.0; safe decimal exclusions are reported but do not fail validation. The backend generated Prisma Client 6.19.3, passed Prisma schema validation, strict typecheck, build, and all 55 Vitest tests across 13 files. The validator migrated the hint-review artifact metadata to schema version 2 while preserving all reviewer draft and decision fields (verified by a before/after digest). No PostgreSQL service or `server/.env` was present. Migration deployment and database import were not run, so no database import is claimed. The web production build has previously been scanned for source question IDs, source text, source hints, and review artifact markers; no matches were found.

## Current integration fixture boundary (2026-10-25)

The full-match integration test first verifies the production playable pool is empty and that host start is rejected with `QUESTION_BANK_INCOMPLETE`. Synthetic questions are inserted only after that check, with a test-only source tag, inside the explicitly enabled database integration test. Fixture access requires all of: `NODE_ENV=development`, `SAMKARO_RUN_DB_INTEGRATION=1`, and a URL resolving to `samkaro_dev`; the integration test also verifies `current_database()`. Fixture selection is injected into that test's in-process Socket.IO server only. The normal game repository always excludes the fixture source, even when the test flag exists in process environment. The test deletes only rows carrying its own generated fixture IDs and confirms no fixture rows remain after cleanup. The current question source audit remains 200 source records, 169 normalized integer candidates, 14 near-duplicate pairs, and zero approved playable production questions; validation did not change reviewer-authored hint fields, and no importer was run.
