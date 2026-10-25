# Samkaro (سمكرو)

Samkaro is an Arabic-first multiplayer number-guessing party game. Players create or join a room, receive private hints, wager during a match, submit guesses, and compare server-settled results. The web client is RTL-first; the Node.js server owns room membership, round state, private hints, balances, scoring, and reveals.

**Developed by Mohamed Semary**

## Repository layout

- `web/` — React, TypeScript, and Vite browser application, Arabic assets, and the question source bank.
- `server/` — Express and Socket.IO API, Prisma persistence, game engine, question review/import tooling, and tests.
- `shared/contracts.ts` — typed REST and Socket.IO contracts shared by the browser and server.
- `server/prisma/` — Prisma schema, additive migrations, and seed script.
- `app/`, `gradle/`, and root Gradle files — Android application (currently a separate local-fixture client).
- `DEVELOPMENT-SETUP.md` — concise setup notes for this checkout.

## Requirements

- Node.js 20.19 or newer and npm 10 or newer.
- PostgreSQL 16 or Docker Desktop with Docker Compose.
- PowerShell examples below use `npm.cmd` to work on Windows.

## Local setup

From the repository root, create local environment files only when they do not already exist. Review the example values and keep real credentials in the ignored `.env` files.

```powershell
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (-not (Test-Path web/.env)) { Copy-Item web/.env.example web/.env }
```

The server example targets a local PostgreSQL database named `samkaro`. `server/docker-compose.yml` starts that database and stores its data in a named Docker volume. Confirm the target is a development database before applying migrations.

```powershell
docker compose -f server/docker-compose.yml up -d postgres

Push-Location server
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:deploy
Pop-Location

Push-Location web
npm.cmd ci
Pop-Location
```

If using a locally installed PostgreSQL server instead of Docker, set `DATABASE_URL` in `server/.env` to that local database. The web example uses the local server at port 3001; change its Vite URLs only when the local backend uses another origin.

## Start the applications

Use separate PowerShell windows from the repository root.

```powershell
Push-Location server
npm.cmd run dev
```

```powershell
Push-Location web
npm.cmd run dev
```

Vite serves the browser app at `http://localhost:5173`; Express and Socket.IO use `http://localhost:3001` by default. The web client uses the real server by default and does not silently switch to fake multiplayer when it is unavailable.

The Android project is separate from the server-backed web application and currently uses local development fixtures. Open the root Gradle project in Android Studio to inspect or build it.

## Questions and local test mode

Production matches can start only when five eligible questions have complete, editor-approved gameplay hints. The current review artifacts report no approved playable questions, so a normal match start is expected to be rejected until the editorial workflow approves enough questions. Do not change approval flags or import unreviewed questions to make a demo appear playable.

The local test-question pool is an isolated development aid. It requires `NODE_ENV=development`, the explicit `SAMKARO_ENABLE_TEST_QUESTION_POOL=1` opt-in, and a live database named `samkaro_dev`. The repository checks both the configured database URL and the live database identity. Never enable this flag in production. The integration runner separately enables synthetic fixtures only in its isolated in-process test repository.

Question source auditing and approval are managed by the server scripts and the review artifacts under `server/data/` and `server/reports/`. Read [server/docs/question-bank-import.md](server/docs/question-bank-import.md) before running an import. The seed script is not a production question import workflow.

## Checks

Run web checks from `web/`:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Run server checks from `server/`:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The PostgreSQL-backed room and five-round Socket.IO integration test requires a disposable, explicitly configured `samkaro_dev` database. Confirm that database is safe for test writes before running:

```powershell
Push-Location server
npm.cmd run test:integration
```

The test verifies database identity before it writes and scopes cleanup to its own fixture records. It is not part of the regular unit-test command.

## Current limitations and release notes

- The normal production question pool has no approved playable question/hint set yet; production gameplay remains safely blocked until editorial review is complete.
- The web app has no configured automated frontend test script. Backend tests cover deterministic game behavior and a database-backed multiplayer integration flow.
- The Android client is not connected to the server-backed multiplayer implementation.
- The backend currently runs as a single instance; the server documentation lists infrastructure work required before horizontal scaling.
- No deployment target or production launch configuration is included in this repository.

Before publishing, review the question source and review artifacts for intended redistribution, check that only `.env.example` files contain placeholder values, and review the complete source-file list. Local environment files, browser profiles, generated artifacts, and database data are not GitHub source files.

## Local contribution workflow

1. Create or reuse local `.env` files without overwriting existing values.
2. Use a development database, and a separate disposable `samkaro_dev` database for the integration test.
3. Keep production question approvals and records unchanged during UI or gameplay development.
4. Run the checks above for the packages you changed.
5. Review `git status` and staged paths explicitly before making a commit. This checkout currently has no Git repository initialized.
