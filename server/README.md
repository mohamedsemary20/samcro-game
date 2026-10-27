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
- `src/questions/`: repository that selects structurally eligible active questions, generates private numeric hints, and strips answers from public metadata.
- `src/questions/questionBank.ts`: recursive source discovery, conservative normalization, duplicate checks, and audit reports.
- `src/questions/questionBankImporter.ts`: idempotent serializable import that preserves source ownership and provenance.
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
- Five active questions with structurally safe data are required per match. Player-specific numeric hints are generated privately by the server. Golden Hint stays disabled (`GOLDEN_HINT_PROBABILITY=0`) until its once-per-match scope and selection rule are implemented.
- The reconnect grace period is 60 seconds. A waiting-room member who remains disconnected past the grace period is removed; an active match retains the participant and times out their decisions.

## Question data

The preserved source bank is `../web/questions/trivia_clean.json`; its structural validation, safe normalization, mapping rules, duplicate policy, and import commands are documented in [docs/question-bank-import.md](docs/question-bank-import.md). The importer preserves stable IDs and provenance, imports supported safe-integer question data idempotently, and activates structurally valid records. `source_hint` remains source metadata; the server generates private numeric hints from answers. Legacy editorial review rows are retained but no longer gate gameplay.

The small examples in `prisma/seed.ts` remain separate, unverified, disabled development data. Source answers are not independently fact-checked by the application; the authorized gameplay eligibility policy relies on structural validation and retains their original provenance.

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

For the database-backed lifecycle and full-match test, use a disposable local PostgreSQL schema. The integration runner verifies `current_database()` is `samkaro_dev` before making test writes. It runs three independent guest sessions through room creation/joining, readiness, an invalid retry, a successful match start, initial public/private state delivery, reconnect, and all five rounds using imported canonical database questions. Question records remain in the isolated test schema; room, player, and match records created by the test are cleaned up. The regular unit suite skips this database integration test.

## Question eligibility and production configuration

`Question.enabled` is the single gameplay eligibility flag. The importer activates structurally valid non-negative safe-integer questions from the canonical bank. The old hint/review table and JSON review artifact are retained as legacy data and no longer block play; the game generates each player's numeric hint privately from the answer.

Apply migrations and import questions only after verifying the database name and host. Production environment values belong in the backend hosting runtime: `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUSTED_ORIGINS=https://samcro-game.pages.dev`, `SOCKET_PUBLIC_ORIGIN=https://samcro-game.pages.dev`, and `DATABASE_URL` set as a secret for the intended production PostgreSQL database. Leave `SAMKARO_ENABLE_TEST_QUESTION_POOL` unset.

The web deployment settings are documented in `../web/README.md`. Production question import and Pages deployment still require access to the intended production database and Cloudflare Pages project.

## Current limitations

- The server currently runs as a single instance. Horizontal scaling needs a Socket.IO Redis adapter, shared rate limiting, and a worker/lease mechanism for timed actions.
- There is no admin interface, chat service, or operator recovery tooling. Hints remain server-generated and player-private.
- The source bank's answers have not been independently re-fact-checked by this application. Structurally valid source records can play under the authorized simplified eligibility policy; source text and provenance are retained.
