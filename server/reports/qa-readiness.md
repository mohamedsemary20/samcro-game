# Samkaro QA readiness

## Current stabilization verification (2026-10-25)

This section supersedes older environment and multiplayer status entries below where they conflict. Checks were run in `C:\Users\MASR FRANSA\Downloads\samcro`; the checkout has no `.git` directory, so Git status/diff was unavailable.

### Current environment

- PostgreSQL service `postgresql-x64-18` is running and port 5432 accepts connections. The existing `server/.env` was inspected without printing values: it resolves to `samkaro_dev`, `NODE_ENV=development`, `GOLDEN_HINT_PROBABILITY=0`; the integration fixture flag is not set there.
- Prisma CLI and generated client package are both 6.19.3. `prisma validate` passed, and `prisma migrate status` found the two committed migrations applied with the schema up to date. Prisma generation was not rerun because the generated client matches the CLI and an active local service is using the client; process ownership metadata is restricted, so it was not stopped.
- `GET http://localhost:3001/api/v1/health` and `/socket.io/socket.io.js` both returned HTTP 200. Port 5173 served the current Vite app.
- The production eligible-question query returned zero; the integration fixture source count was zero after cleanup. Golden Hint remains at probability zero.

### Current verification results

| Command/check | Result |
|---|---|
| `npm.cmd run test:integration` | Passed three consecutive runs (each exit 0). Each used three independent guest sessions, rejected the empty bank with `QUESTION_BANK_INCOMPLETE` while retaining the connected socket and waiting room, then completed five fixture-only rounds and received all five reveal events plus `game:complete`. Persisted status was `FINISHED`, all five rounds used only fixture IDs, and emitted standings matched persisted participant ranks. Scoped cleanup passed. |
| `npm.cmd test` | Exit 0: 61 passed; the database integration test was skipped by the default suite. |
| `npm.cmd run typecheck` (server) | Exit 0. |
| `npm.cmd run build` (server) | Exit 0. |
| `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd run typecheck` (web) | All exit 0. |
| `npm.cmd run questions:validate` | Exit 0 with 200 source records, 171 candidates, 169 normalized integer records, 29 source-excluded records, 14 near-duplicate pairs, and zero playable questions. Because `tsx` hit Windows `uv_os_get_passwd ENOMEM`, the command used a process-only Node preload shim; it did not change persistent environment settings. Reviewer-authored draft and decision fields were hashed before/after the final validation and were unchanged. No import ran. |
| Question repository boundary tests | Passed as part of the backend suite: fixtures require the explicit flag, development mode, and `samkaro_dev`; default repositories reject fixture rows. Integration opts in by injecting a fixture repository only into its ephemeral test server. |

The old full-match timeout was not reproduced. The integration test's completion listener was previously attached conditionally near the final phase; it is now registered before match start, and timeout failures include persisted match state. All five rounds and completion were observed across the three consecutive runs. This identifies and removes a test-observer race risk; the original timeout had no round-by-round trace, so its historical trigger cannot be proven.

### Browser status and remaining release gates

Frontend source now keeps the saved room ID after transient restore errors and offers retry. Expected socket action errors preserve a healthy room/socket; `QUESTION_BANK_INCOMPLETE` has a clear Arabic message. Frontend policy tests pass. A local real-browser reproduction was **not verified**: Chrome was available and launched headlessly, but the environment automatically rejected the authorized CDP script that would create isolated guest sessions and mutate the local database. The browser process was closed. The temporary profile `.tmp-samkaro-cdp` remains because recursive cleanup was also rejected by the workspace policy. No user cookies or sessions were placed in it.

Manual browser check: in three browser profiles, create/join a capacity-three room, ready all players, and start as host while the production bank remains empty. Confirm the Arabic incomplete-question error appears, the room and roster remain visible, connection status remains connected, and a guest readiness change still updates the roster. For restore retry, reload during a transient API outage, restore the API, then use the restore retry and confirm the saved room returns.

No production question or hint was imported or approved. The approval gate, source fingerprints, authentication, authorization, deadlines, betting, answer privacy, and Golden Hint safeguards were preserved. Android files were not changed. Production gameplay remains blocked pending human verification and approval of sufficient questions and hints.

## Current integration verification (2026-10-24)

This section supersedes older readiness statements below where they differ. This verification was performed in the checkout at `C:\Users\MASR FRANSA\Downloads\samcro`.

### Current environment and install findings

- Runtime: Node.js `v24.21.0`, npm `11.19.0` (server requires Node.js 20.19 or newer). npm is configured for `https://registry.npmjs.org/`.
- `npm.cmd ping --registry=https://registry.npmjs.org/ --fetch-timeout=8000 --fetch-retries=0`: **exit 1**, network request rejected with `EACCES`.
- The workspace cache directory `.codex-npm-cache` is writable. The user-level npm cache path under `AppData\Local\npm-cache` cannot accept npm log writes. An offline install from the workspace cache failed **exit 1** with `ENOTCACHED` for `@prisma/client`.
- The online `npm.cmd install` attempt was interrupted after it hung without output; it did not install dependencies. No server `node_modules` or `server/package-lock.json` existed at the start, and no lockfile was generated. `web/node_modules` and `web/package-lock.json` are present and were left untouched.
- PowerShell blocks the `npm.ps1` shim, so commands below use `npm.cmd`.
- No Docker/Docker Compose executable, PostgreSQL client/server executable, PostgreSQL service, or listener on ports 5432, 3001, or 5173 was found. No `server/.env` or `web/.env` exists; only example files are present. No environment file was created or overwritten.
- Prisma uses PostgreSQL and `DATABASE_URL` from the environment. The checked-in example points to a local Compose database, but no database is running. No migration, seed, question import, or database write was attempted. It would be unsafe to apply migrations without a confirmed isolated test database.

### Backend commands and exit codes

Commands ran from `server/`:

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd test` | 1 | Blocked before tests: `vitest` is not recognized. No test assertions ran. |
| `npm.cmd run typecheck` | 1 | Blocked before type checking: `tsc` is not recognized. |
| `npm.cmd run build` | 1 | Blocked before build: `tsc` is not recognized. |
| `npm.cmd run questions:validate` | 1 | Blocked before validation: Node cannot find `tsx`. No validation artifacts were regenerated. |
| `npm.cmd run db:generate` | 1 | Blocked before Prisma Client generation: `prisma` is not recognized. |

The frontend dependencies and prior successful frontend build/lint/typecheck are reported by the implementation; those checks were not rerun in this verification.

### Multiplayer scenarios

**End-to-end multiplayer smoke test: NOT RUN; no client completed any scenario.** The backend could not start without dependencies or a database, and there is no isolated PostgreSQL instance to hold test-only synthetic questions. The existing `server/test/fixtures/syntheticGame.ts` is a unit-test fixture, not a seeded database. No production questions were imported or approved.

The current socket handler requires at least **three** ready members before `match:start` (`PLAYERS_NOT_READY` otherwise). Two independent clients alone cannot start a match under the existing server contract; a third test client would be needed to exercise game flow without changing rules. The lobby UI currently says the minimum is **four** players, while the backend permits three; this contract/UI discrepancy is recorded for follow-up and was not changed. The following required integration checks remain untested:

| Scenario | Result |
|---|---|
| Start backend and call health endpoint | Not run: dependency installation and database unavailable. |
| Connect two independent clients; create room and join | Not run: backend unavailable. |
| Readiness and match start | Not run: backend unavailable; match start requires at least three ready members. |
| Play a round, submit secret guess, and bet | Not run: no active match or test question records. |
| Enforce deadlines and verify authoritative balances | Not run: no database-backed match. |
| Verify answer privacy before reveal | Not run at socket level; existing unit tests cover public projection privacy only. |
| Disconnect and reconnect | Not run at Socket.IO level; existing room-service tests cover mocked rejoin and expiry behavior only. |
| Verify round result and final standings | Not run: no completed database-backed match. |

### Remaining actions

1. Restore official npm registry connectivity or provide the declared dependency tarballs in a writable cache, then install the existing server manifest without upgrading packages. Generate and retain a server lockfile only after successful resolution.
2. Provision a disposable PostgreSQL database dedicated to this test, configure `server/.env` without overwriting any existing file, generate Prisma Client, validate schema, and apply committed migrations only after confirming the target is isolated.
3. Insert test-only synthetic question and approved-hint rows directly into that isolated test database (never through the production importer) and run at least three independent clients through the Socket.IO contracts.
4. Rerun the backend typecheck, tests, build, question validation, schema validation, and full multiplayer scenarios; record exit codes and observed outcomes.

## Scope and verified data

Review was limited to server tests, fixtures, package scripts, question-bank artifacts, and the existing production bundle. The source question bank, excluded rows, hints, importer, game implementation, and frontend source were not changed. No answers were fact-checked, no hints were approved, and no PostgreSQL import was attempted.

Current files contain 171 `clean` candidates, 29 `removed` source records, 169 normalized integer questions, 2 excluded decimal candidates, 14 near-duplicate pairs, and 169 hint-review records. The hint artifact has zero approved records. All 169 hint IDs have matching normalized source fingerprints. The current playable count remains zero; Golden Hint remains disabled.

## Tests and fixtures

Added test-only synthetic question data in `server/test/fixtures/syntheticGame.ts`; it is not read by the importer or production question repository. Added coverage in `server/test/gameLifecycle.test.ts`, `server/test/roomSchema.test.ts`, and `server/test/roomService.test.ts` for minimum/maximum population boundaries, invalid capacities and guesses, betting actions, timeout boundaries, unauthorized actions, tie settlement, final match completion, room membership, host handoff, rejoin state reset, disconnected lobby expiry, and blocking voluntary leave during a match.

Existing tests already cover out-of-turn bets, betting and raise behavior, folds and timeouts, public question projections without answers/hints, private per-player hint delivery, scoring ties, and question-import approval/fingerprint rules. `server/test/engine.test.ts` had a shared-contract import resolving outside the repository; its path now points to `../../shared/contracts.js`.

The room lifecycle tests use a mocked Prisma boundary. They do not establish full Socket.IO disconnect/reconnect behavior or a database-backed multiplayer match. A complete game start currently also lacks approved playable questions.

## Script dependencies and blockers

The server scripts are declared in `server/package.json`:

- `test` invokes `vitest run`; the required server dev dependency is `vitest ^3.2.4`.
- `typecheck` invokes `tsc -p tsconfig.json --noEmit`; the required server dev dependency is `typescript ^5.9.3`.
- `questions:validate` invokes `node --import tsx`; the required server dev dependency is `tsx ^4.20.6`.

`server/node_modules`, `server/package-lock.json`, and `server/.env` are absent. The web workspace has TypeScript installed, but its binary is not on the server script's resolution path. No dependencies were installed. Without the server workspace dependencies, Vitest cannot execute the suite; after the runner is installed, the suite also needs the server's declared runtime dependencies (including Zod for schema tests and Prisma client for service imports). No `psql` executable was found, so database-backed multiplayer checks and imports were unavailable.

## Validation results

### Passed checks

- Data count, unique-ID, zero-approval, and fingerprint assertions passed.
- Syntax transpilation passed for all 13 test files and the synthetic fixture (14 files, zero syntax diagnostics). This does not establish type correctness.
- The scan of the existing production bundle found none of the checked question-bank identifiers or review-artifact names.

### Failed tests

- No test assertion failures were observed. The server test runner could not start, so behavior tests are not marked passed or failed.

### Blocked checks

| Check | Result |
|---|---|
| `npm.cmd test` (from `server`) | **Blocked**, exit 1: `vitest` is not recognized. |
| `npm.cmd run typecheck` (from `server`) | **Blocked**, exit 1: `tsc` is not recognized. |
| `npm.cmd run questions:validate` (from `server`) | **Blocked**, exit 1: Node cannot find package `tsx`. No validation artifacts were regenerated. |
| TypeScript syntax transpilation of 13 `*.test.ts` files and the synthetic fixture using installed web TypeScript | **Passed**, 14 files, zero syntax diagnostics. This is syntax-only, not type checking. |
| Inline JSON/count/fingerprint assertions | **Passed**: source counts, normalized/hint counts, unique hint IDs, zero approvals, and all 169 source fingerprints matched. |
| `rg -n "football_001|series_016|question-bank-hints|trivia_clean\.json" web/dist` | **Passed for the existing bundle scan**, zero matches (ripgrep exit 1 means no matches). This did not rebuild the frontend bundle. |

The JSON and syntax checks were run with PowerShell here-strings piped to `node -`; syntax transpilation loaded `./web/node_modules/typescript`. The existing `web/dist` scan is evidence only about those already-built assets.

## Readiness and remaining work

Automated server behavior tests are **not runnable in this checkout** until the declared server dependencies are installed. No arbitrary versions were selected and no package manifest or lockfile was changed. Full multiplayer testing still needs an isolated test database, generated Prisma client, and an approved playable question set; approval and import were explicitly out of scope. Socket-level reconnect-within-grace coverage remains an integration-test task. Current evidence does not identify a confirmed implementation defect because the server suite could not execute.

### Issues for another engineer

- Restore/install the declared server workspace dependency set (including Vitest, TypeScript, `tsx`, Zod, and Prisma Client) so the existing scripts can run. The absent lockfile leaves package resolution unconstrained by a checked-in server lock.
- For end-to-end multiplayer readiness, provision an isolated test database and generated Prisma client, then add approved fixture records through the established approval workflow. This task did not approve/import records.
- Add Socket.IO integration coverage for disconnect and reconnect during the grace window. Current tests cover the room-service rejoin and expiry boundaries only.

## Latest environment recheck (2026-10-24)

The server checks above were rerun from the current checkout. The root has no `package.json`, npm workspace definition, root lockfile, or `.npmrc`; `web/` and `server/` are separate npm projects. `web/package-lock.json` remains present. `server/package-lock.json` and `server/node_modules` remain absent. The server install failed before resolving packages, so no lockfile was generated and no dependency versions were selected. No `.env` file was created or read.

### Registry and cache diagnosis

- `node --version` — **exit 0**, `v24.21.0`.
- `npm.cmd --version` — **exit 0**, `11.19.0`.
- `npm.cmd config get registry` — **exit 0**, `https://registry.npmjs.org/`.
- `npm.cmd config get cache` — **exit 0**, `C:\Users\MASR FRANSA\AppData\Local\npm-cache`.
- `npm.cmd ping --registry=https://registry.npmjs.org/ --cache="C:\Users\MASR FRANSA\Downloads\samcro\.codex-npm-cache" --fetch-timeout=10000 --fetch-retries=0` — **exit 1**, OS `EACCES` connecting to the official registry.
- `Test-NetConnection registry.npmjs.org -Port 443 -InformationLevel Quiet` — **False**; outbound TCP 443 was unavailable.
- `npm.cmd cache verify --cache="C:\Users\MASR FRANSA\Downloads\samcro\.codex-npm-cache"` — **exit 0**, cache verified with zero entries. npm successfully wrote diagnostic logs there. This project-local cache avoids the default cache path for the command, but does not fix registry connectivity.
- The default cache path could not write npm logs during `npm.cmd exec --offline -- prisma validate` (npm reported that logs were not written to its AppData cache). Use a user-owned cache path once registry connectivity is restored; no global npm configuration was changed.

### Install and verification commands

From `server/`:

| Command | Exit | Actual result |
|---|---:|---|
| `npm.cmd install --registry=https://registry.npmjs.org/ --cache="C:\Users\MASR FRANSA\Downloads\samcro\.codex-npm-cache" --fetch-retries=0 --fetch-timeout=10000` | 1 | `EACCES` fetching `@prisma/client`; no dependency resolution or lockfile creation. |
| `npm.cmd test` | 1 | Vitest is not recognized; suite did not start and no test assertion result is available. |
| `npm.cmd run typecheck` | 1 | `tsc` is not recognized; typecheck did not run. |
| `npm.cmd run questions:validate` | 1 | Node `ERR_MODULE_NOT_FOUND` for `tsx`; question validation did not run and produced no new validation result. |
| `npm.cmd run db:generate` | 1 | Prisma is not recognized; client generation did not run. |
| `npm.cmd exec --offline --cache="C:\Users\MASR FRANSA\Downloads\samcro\.codex-npm-cache" -- prisma validate` | 1 | `ENOTCACHED`; Prisma is not installed and no cached registry metadata is available. Schema validation did not run. |

PostgreSQL recheck: no listener on port 5432. Docker command/service was unavailable. `server/.env` is absent while `.env.example` exists; `DATABASE_URL` therefore has not been configured here. No migrations were applied. The health endpoint, database-backed room creation/joining, and Socket.IO flow remain untested.

### Minimum next steps

1. Restore outbound HTTPS access to `registry.npmjs.org` and use a writable user-owned npm cache (for example, pass `--cache "$env:LOCALAPPDATA\npm-cache"` per command if that path is writable). Do not change registries or disable TLS checks.
2. From `server/`, run `npm.cmd install --registry=https://registry.npmjs.org/ --cache <writable-user-cache>`. Because this server project has no lockfile, review the newly resolved `package-lock.json` before relying on it; commit it to make future installs reproducible. The existing web lockfile is separate and should remain unchanged.
3. Rerun `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run questions:validate`, `npm.cmd run db:generate`, and Prisma schema validation. Configure a local `DATABASE_URL` and provision an isolated PostgreSQL database before attempting integration tests or migrations.
4. Keep the playable-question count at zero until the existing editorial approval workflow produces approved hint records. Do not import or fabricate approvals as a setup shortcut.

## Follow-up verification (2026-10-24)

The web checks were rerun from the current checkout and pass:

| Command | Result |
|---|---|
| `npm.cmd run build` (from `web/`) | Passed; Vite production bundle built. |
| `npm.cmd run lint` (from `web/`) | Passed; ESLint reported no issues. |
| `npm.cmd run typecheck` (from `web/`) | Passed; `tsc -b --pretty` exited 0. |
| `npm.cmd run dev -- --host 127.0.0.1` (from `web/`) | Passed; Vite became ready and `http://127.0.0.1:5173/` returned HTTP 200. No browser automation was run. |

Backend checks were also retried and remain blocked before execution: `npm.cmd test` cannot find `vitest`; `npm.cmd run typecheck` and `npm.cmd run build` cannot find `tsc`; `npm.cmd run questions:validate` cannot find `tsx`; and `npm.cmd run db:generate` cannot find `prisma`. The manifest exists, but `server/node_modules`, `server/package-lock.json`, and `server/.env` do not. npm's configured registry is the official `https://registry.npmjs.org/`; npm can write logs to the project cache, while `Test-NetConnection registry.npmjs.org -Port 443` fails for all resolved addresses and `npm ping` reports OS `EACCES`. This diagnoses the install blocker as unavailable outbound HTTPS, not the workspace cache permissions. No registry override, TLS bypass, or credentials were used.

Environment recheck found no Docker, Compose, PostgreSQL client/server tools, or listener on port 5432. No database, migration, seed, or import operation was attempted. The health endpoint and REST/Socket.IO integration flows remain untested. Frontend source is server-connected by default; demo mode is opt-in with `VITE_APP_MODE=demo-local` during development. The Vite production build passed, but no browser-driven verification was run.

Question artifact counts were re-read from their current structures: 171 source `clean` candidates, 29 source `removed` rows, 200 total source rows, 169 normalized integer records, 169 hint review records, 14 near-duplicate pairs, and zero approved hints. The game remains unplayable from production questions until human review approves records. Golden Hint remains disabled. The web bundle build did not include the source question bank or private review files.

**End-to-end multiplayer result: NOT RUN.** No clients completed a match. A disposable PostgreSQL database, installed backend dependencies, and test-only synthetic question rows are still needed. Existing room policy requires at least three ready players, so the smoke test setup needs three clients (including at least two independent clients) unless product rules are explicitly changed. No game rule or production question approval was changed in this follow-up.

## Completion mission follow-up (2026-10-24)

The current checkout was rechecked. The Android project remains untouched. The `web/` and `server/` projects are separate npm projects; the official npm registry remains configured, but the prior network test showed outbound TLS to it unavailable and npm reported `EACCES`. Server dependencies are still absent, so the backend test runner, TypeScript compiler, `tsx`, and Prisma CLI cannot execute. No repeated install was attempted. Docker/PostgreSQL were previously rechecked unavailable; no `.env` was created and no database operation was attempted.

Frontend validation rerun from `web/`:

| Command/check | Result |
|---|---|
| `npm.cmd run typecheck -- --pretty false` | Passed. |
| `npm.cmd run lint` | Passed. |
| `npm.cmd run build` | Passed; Vite production build generated. |
| `npm.cmd run dev -- --host 127.0.0.1`; request `/` | Passed, HTTP 200. |
| Request `/questions/trivia_clean.json` from Vite | Blocked with HTTP 403, as intended by the Vite filesystem deny rule. |
| Scan `web/dist` for source IDs, bank/review paths, and source fingerprint field | No matches. |

Backend commands were attempted from `server/` and remain blocked before their checks start: `npm.cmd test` cannot find `vitest`; `npm.cmd run typecheck` and `npm.cmd run build` cannot find `tsc`; `npm.cmd run questions:validate` cannot resolve `tsx`; and `npm.cmd run db:generate` cannot find `prisma`. The question-bank source parser and review-gate functions were directly exercised with Node 24's built-in TypeScript stripping as a focused smoke check; the full Vitest suite was not run. Syntax transpilation using the installed web TypeScript passed for seven changed server files, syntax-only and not a typecheck.

The source audit was refreshed without rewriting the reviewer hint artifact: one source JSON, 200 records total (171 clean candidates and 29 source-excluded rows), 169 normalized safe-integer records, two decimal records rejected under the current integer policy, zero duplicate IDs, zero exact duplicate prompts, 14 near-duplicate pairs for human review, 169 hint-review records, zero explicit approvals, and zero playable questions. The 29 excluded source rows remain preserved. The report now includes source field types, answer formats, and raw rejected decimal values. The importer policy and documentation were aligned so a complete, current explicit editorial/fact-check approval is the only path that enables a question. Existing reviewer-authored decisions/drafts are preserved by fingerprint; the actual review artifact was not regenerated or approved. A mock-transaction smoke check verified zero writes with the current unapproved artifact and the enabled-question/approved-hint insert path with one synthetic, test-only approval. Production import count remains **not run**.

**End-to-end multiplayer result: NOT RUN.** There is no usable backend dependency installation or PostgreSQL service, and the approved production question count remains zero. A complete smoke match additionally needs at least three ready clients under the current room policy; use isolated synthetic test records for testing only, without weakening the production approval gate. Golden Hint remains disabled.

### Remaining external actions

1. Restore outbound HTTPS access to the official `https://registry.npmjs.org/` endpoint, then install the declared server dependencies from `server/` using a writable user-owned npm cache.
2. Provide a disposable PostgreSQL development database, set `DATABASE_URL` in a newly created `server/.env` based on `.env.example` (do not overwrite an existing file), generate Prisma Client, and deploy migrations only to that confirmed disposable database.
3. For production play, have a human verify the answers and author/review/explicitly approve at least five question hints through the existing fingerprinted workflow. Do not import the current unapproved bank.

## Backend repair verification (2026-10-24)

Prisma CLI and Client are both version 6.19.3. The schema uses the standard `prisma-client-js` generator and is compatible; the generated client had simply not been generated in this environment. After `npm.cmd run db:generate`, the former missing `Prisma.*`, model, and transaction inference errors disappeared. The observed initial count was 81 errors; the final backend typecheck and build report zero.

| Command/check | Result |
|---|---|
| `npm.cmd run db:generate` | Passed, generated Prisma Client 6.19.3. |
| `npm.cmd run typecheck` | Passed, exit 0. |
| `npm.cmd test` | Passed, 13 files and 55 tests. |
| `npm.cmd run build` | Passed, exit 0. |
| Prisma `validate` (with a process-only disposable `DATABASE_URL`) | Passed, schema valid. |
| `npm.cmd run questions:validate` | Passed, exit 0 using a temporary process-only Node OS-userinfo shim required by this sandbox's `tsx`; the shim was removed afterward. Safe excluded decimal rows remain reported; fatal malformed-source and duplicate-ID conflicts still fail validation. |
| Compiled server `GET /api/v1/health` | Passed, HTTP 200 on port 3301. |

Fixes include mapping persisted hint `note` into the shared wire contract's `advisoryNote`; strict scalar route-param validation; guarded near-duplicate pair handling; v1 hint-review artifact normalization to schema v2; and test clock corrections that keep actions before their deadlines. The final-round no-score test now asserts the documented rule: the last eligible player in stable ID order receives the carried pot. The importer test now checks the real persisted creation payload while retaining the explicit approval requirement. Question validation migrated the existing review artifact metadata to schema v2; a before/after digest of all 169 reviewer draft/decision fields was identical, and zero hints are approved.

The plain `npm.cmd run questions:validate` initially could not start because `tsx` calls `os.userInfo()`, which raises `uv_os_get_passwd ENOMEM` in this Windows sandbox despite available memory. The command passed with a temporary preload shim; no product code or persistent environment setting was added for this sandbox issue. PostgreSQL remains unavailable and `server/.env` remains absent. Prisma migration deployment, DB-backed room lifecycle, health readiness, two-client realtime behavior, and complete multiplayer matches were not exercised. The server process served the health route while emitting expected connection errors from its periodic DB maintenance task against the intentionally unavailable local test database; it was stopped immediately.

**Two-client match result: NOT TESTED.** A disposable PostgreSQL instance is still required. The room policy needs at least three ready clients to start a match; synthetic fixture questions are available only for tests, and the production bank remains at zero approved/playable questions.

## PostgreSQL room integration follow-up

The current server `.env` was parsed without displaying credentials; its database name was `samkaro_dev` at `localhost:5432`. The integration test independently confirmed `current_database()` and verified each test guest's cookie token hash exists in that database before continuing. It starts an ephemeral in-process Express/Socket.IO server using the real handlers and uses three independent WebSocket connections speaking the server's Engine.IO v4 / Socket.IO event protocol. The active service on port 3001 was left running.

| Command/check | Result |
|---|---|
| `npm.cmd run test:integration` | Passed, 1 PostgreSQL-backed test. |
| Integration scenario | Three guest sessions created; host created capacity-three room; other two joined; all three readiness states verified; unauthenticated room read returned 401; non-host `match:start` returned `HOST_REQUIRED`; host start passed room/ready checks and returned `QUESTION_BANK_INCOMPLETE`; no match row was created; room remained waiting. |
| Scoped cleanup | Passed. Test removed only its exact waiting room and its three new players after checking room ownership, membership, zero matches, and external references; it asserted all created player and room rows were gone. No pre-existing rows were reset or deleted. |
| `npm.cmd test` | Passed, 55 tests; integration test skipped in the default unit suite. |
| `npm.cmd run typecheck` | Passed, exit 0. |
| `npm.cmd run build` | Passed, exit 0. |
| `npm.cmd exec -- prisma migrate status` | Passed, 2 migrations found and database schema up to date. |
| `npm.cmd run db:generate` | This reattempt failed with Windows `EPERM` renaming `query_engine-windows.dll.node`, while the existing backend process was running. Earlier generation had succeeded; no schema change was made, and the existing generated client passed typecheck/tests/build. The running backend was not stopped. |
| `GET http://localhost:3001/api/v1/health` after integration | Passed, API remained healthy. |

The integration test adds `test:integration` and uses installed `ws`/`@types/ws` as its direct development dependencies. Attempting to fetch `socket.io-client` from the official npm registry failed with OS `EACCES` in this execution environment; no mirror or TLS workaround was used. No source questions were inserted, no production hints approved, and no gameplay match was started because the approved production pool is empty. **A complete multiplayer match remains untested.**
