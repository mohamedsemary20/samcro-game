# Samkaro multiplayer server

`server/` is the Node.js + TypeScript backend. It uses Express 5 for REST, Socket.IO 4 for realtime updates, PostgreSQL with Prisma, Zod input validation, and Vitest unit tests. The browser/server wire contracts live in `../shared/contracts.ts` and deliberately contain no answer field in public state.

## Prerequisites and local startup

- Node.js 20.19 or later and npm 10 or later
- Docker Compose, or a local PostgreSQL 16 database

From the repository root, in PowerShell:

```powershell
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
Set-Location server
npm.cmd ci
docker compose up -d postgres
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

Edit the local, ignored `server/.env` if the PostgreSQL URL differs from the local Compose example. The `.env.example` file is a template; never commit a populated `.env`. `COOKIE_SECURE` must be true behind HTTPS in production, and `TRUSTED_ORIGINS` must list each browser origin exactly.

The schema is in `prisma/schema.prisma`; migrations add the initial schema and question provenance. Do not overwrite an existing `.env` when setting up another environment, and do not run migrations against a database containing user data without authorization.

## Architecture

- `src/http/`: versioned REST routes, middleware, request validation, and error responses.
- `src/auth/`: random guest credentials, hashed session tokens, and HTTP-only cookies.
- `src/realtime/`: cookie-authenticated, origin-checked, rate-limited Socket.IO events.
- `src/rooms/`: room capacity, membership, readiness, reconnect grace, and host changes.
- `src/game/engine.ts`: deterministic game rules independent of Express and Socket.IO.
- `src/game/gameService.ts`: serializable Prisma state transitions, idempotency, balances, reveal, and payouts.
- `src/game/chipLedger.ts` and `scoring.ts`: chip policies and exact numeric comparisons.
- `src/questions/`: repository that selects only enabled questions with approved hints and strips answers from public metadata.
- `src/questions/questionBank.ts`: recursive source discovery, conservative normalization, duplicate checks, and audit reports.
- `src/questions/questionBankImporter.ts`: idempotent serializable import that preserves editorial controls and provenance.
- `prisma/`: persistence schema, migrations, and disabled development examples.
- `test/`: deterministic engine, scoring, timing, and chip-policy tests.
- `../shared/contracts.ts`: public and player-private wire DTOs shared with the web client.

`GameRound.engineState` is persisted in PostgreSQL inside the same transaction as actions. Correct answers remain only in the question table and are fetched for reveal after the server transitions to `round-reveal`. Guesses and hints are held in private persisted state and player-specific records; public game state omits them until reveal.

## Approved initial game policies

- Five rounds, 500 starting chips, and a full 50-chip ante. A player below 50 cannot enter that round.
- Before a later round's ante, a provisionally 30-second funding window lets a player below 50 opt into their one unused 200-chip emergency loan. The duration mirrors the existing turn timer because no separate funding duration was specified; review it before launch. Loan funds are debt; repayment uses available chips at match end before the debt-aware leaderboard. If nobody can enter after the window, the match ends and the carried pot remains unawarded.
- Betting order begins in stable player-ID order. A bet timeout folds its actor after 30 seconds; a missing guess is skipped after 30 seconds.
- Raise `amount` is the chips added, including any call portion, and the raise increment must be at least 10. Short all-in calls are allowed. Unmatched excess is refunded to cap contributions to the smallest live stack; the game has no side pots.
- A year uses absolute error. Other numeric answers use percentage error; zero answers score only an exact guess. Tied pots split in stable player-ID order, with remainder chips assigned in that order.
- If a round ends before guesses can decide it, the pot rolls forward. In round five a pot without a scoring guess goes to the last eligible player in stable player-ID order.
- The funding window starts before any ante is charged. A loan request is rejected after the window deadline. Players who do not request the loan sit out. If all players still have fewer than 50 chips, the match ends with the carried pot retained and no payout.
- Each question needs an editor-approved stored hint. Questions without one cannot be selected. Golden Hint stays disabled (`GOLDEN_HINT_PROBABILITY=0`) until its once-per-match scope and selection rule are approved and implemented.
- The reconnect grace period is 60 seconds. A waiting-room member who remains disconnected past the grace period is removed; an active match retains the participant and times out their decisions.

## Question data

The preserved source bank is `../web/questions/trivia_clean.json`; its recursive audit, safe normalization, record review, proposed hint review, mapping rules, duplicate policy, and import commands are documented in [docs/question-bank-import.md](docs/question-bank-import.md). The importer adds source provenance and metadata columns using the additive migration `20261023010000_question_bank_provenance`. It imports only valid integer question data with an explicitly approved, complete hint-review record, enables only those approved records, and never converts `source_hint` or a proposed suggestion into a gameplay hint. The existing repository selects only enabled questions with a supported type and approved complete `ApprovedQuestionHint`; the current hint-review artifact has zero approvals, so the playable count remains zero.

The small examples in `prisma/seed.ts` remain separate, unverified, disabled development data. No answer correctness has been independently verified. Use a controlled editorial workflow to review answers and approve hints; no public endpoint can edit either.

## REST API v1

All routes are under `/api/v1`; JSON errors use `{ "error": { "code", "message", "requestId" } }`.

- `GET /health`
- `POST /sessions/guest` `{ displayName }`, `GET /sessions/me`, `DELETE /sessions/me`
- `POST /rooms` `{ capacity, idempotencyKey }` (capacity 3–7)
- `POST /rooms/join` `{ code }`
- `GET /rooms/:roomId` (active member only)
- `GET /rooms/:roomId/game` (public game DTO, active member only)
- `GET /sessions/me/private-state` (only the current player's private state)
- `GET /matches/history`
- `GET /matches/:matchId/leaderboard` (match participant only)

The guest token is a cryptographically random 256-bit value. Only its SHA-256 hash is persisted, and the token travels in an HTTP-only, SameSite=Lax cookie. Room-code requests and guest creation are rate-limited; all cookie-authenticated mutations check trusted origins.

## Socket.IO v4 contract

Client events: `room:join`, `room:leave`, `room:ready`, `match:start`, `game:sync`, `game:hint.request`, `game:loan.request`, `game:guess.submit`, and `game:bet.submit`. State events: `room:state`, `game:state`, `player:private`, `game:reveal`, `game:complete`, and `session:reconnected`; rejections use `server:error`.

All payloads are Zod-validated, and match start, hints, loans, guesses, and bets carry an idempotency key. Public events go only to authorized room membership; private hints, chip balances, and guesses go to `player:<id>` sockets. Socket.IO serves its own browser client bundle at `/socket.io/socket.io.js`; set `SOCKET_PUBLIC_ORIGIN` and the frontend CSP accordingly when origins differ.

## Validation commands

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run questions:validate
npm.cmd run questions:import
```

Run these from `server/`. They require successful dependency installation; migration commands also require a reachable PostgreSQL database. The root `web/README.md` lists frontend validation commands.

For the database-backed lifecycle and full-match test, configure `server/.env` to point specifically to the disposable `samkaro_dev` database and run:

```powershell
npm.cmd run test:integration
```

The test requires `NODE_ENV=development`, the runner-set `SAMKARO_RUN_DB_INTEGRATION=1` flag, and `samkaro_dev`; it checks both the configured database name and `current_database()` before writes. It uses three independent authenticated Socket.IO sessions and the real room/game handlers. With the question pool empty, it verifies `QUESTION_BANK_INCOMPLETE` leaves the host socket connected and the room waiting. The test then injects a fixture-enabled question repository only into its in-process Socket.IO server, inserts five tagged integer questions with synthetic approved hints, and plays all five rounds. It checks reveal events, `game:complete`, standings against persisted ranks, and that every selected question belongs to the fixture set. Cleanup is scoped to the test room, players, and fixture source tag; it does not reset the database or run the production importer. Normal gameplay always uses a repository that excludes these fixtures. The test is skipped by the regular unit-test command.

## Current limitations and next phase

- The server is intentionally a single instance. Before horizontal scaling, add a Socket.IO Redis adapter, shared rate limiting, and a worker/lease mechanism for timed actions.
- Round engine state and deadlines are persisted, so a restarted process can resume its polling timer, but there is no operator recovery tooling or transaction audit UI.
- There is no verified answer corpus, moderation interface, chat service, or Golden Hint rule. Golden Hint is disabled; source bank questions remain disabled and unplayable until reviewed hints are approved.
- The current checkout has passed backend typecheck, build, unit tests, schema validation, migration status, question-bank validation, and three consecutive database-backed full-match integration runs. The production bank still has zero approved playable questions, so normal matches remain correctly blocked until editorial approvals are completed.

The remaining release gate for production gameplay is human verification of answers and explicit approval of at least five complete gameplay hints. The browser room/error scenario still needs a manual browser check because automated browser actions were blocked by this environment's workspace policy.
