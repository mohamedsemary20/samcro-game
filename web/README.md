# Samkaro web

The browser client is a React 19 + TypeScript + Vite application under `web/`. A separate Kotlin/Jetpack Compose Android app lives in the repository root; it currently uses local fixtures rather than the server-backed multiplayer flow. Shared HTTP and Socket.IO DTOs live in `../shared/contracts.ts`.

## Requirements and local startup

- Node.js 20.19+ (or a compatible current LTS) and npm 10+
- The backend in `../server/` for real sessions and rooms

From the repository root in PowerShell:

```powershell
if (-not (Test-Path web/.env)) { Copy-Item web/.env.example web/.env }
Set-Location web
npm.cmd ci
npm.cmd run dev
```

By default the app uses server mode and calls `http://localhost:3001`. Start the server using the instructions in `../server/README.md`. The browser app has no automatic fake-multiplayer fallback when the server is unavailable.

To explicitly open the isolated local UI demo during Vite development, set `VITE_APP_MODE=demo-local` in `web/.env` and restart Vite. The build config excludes the demo module in production builds, including its fixture answers. Do not deploy demo mode.

## Commands

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

No frontend automated test script is configured yet. Socket.IO client code is served by the backend at `/socket.io/socket.io.js`, so no separate client package is bundled.

## Structure

- `src/components/` and `src/pages/` — shared layout, presentation components, and existing views.
- `src/ServerApp.tsx` — server-backed guest session and room flow.
- `src/DemoApp.tsx` and `src/data/developmentFixtures.ts` — development-only local demo.
- `src/domain/` — validation and re-exports of shared domain contracts.
- `src/services/httpGameApiClient.ts` and `src/services/socketGameConnection.ts` — cookie-authenticated REST and realtime adapters.
- `../shared/contracts.ts` — public/private wire types shared with the server.
- `public/assets/` — logo, casino banner, and Cairo/Tajawal fonts reused from Android.

The server UI connects guest sessions, room creation/joining, readiness, match start, private hints, guess locking, betting actions, reveals, and completed leaderboards to the authoritative backend. The server is not a fake local multiplayer adapter. Chat and profile/settings persistence remain unconnected. A match requires at least three ready players.

Expected Socket.IO action rejections such as `QUESTION_BANK_INCOMPLETE` are shown as Arabic room errors without clearing a healthy room or socket. A transient failure while restoring a saved room keeps its room ID and offers a retry; only a confirmed missing room or expired membership clears that saved ID. The browser app has no automated browser-test runner configured.

For manual recovery verification, open three browser profiles at `http://localhost:5173`, create or join one room, and ready all three players. With the production bank still empty, start as host: the Arabic approved-question error should appear while the room code, roster, and connected lobby remain visible. Change one guest's ready state and verify the roster still updates. To check initial restore recovery, reload during a temporary API interruption, restore the API, then use the room restore retry action; the saved membership should remain available.

## Backend integration plan

The Node.js + TypeScript backend in `../server/` owns authentication, membership, game transitions, hints, guesses, balances, timers, and payouts. PostgreSQL/Prisma is the source of durable state. Public room/game state must never contain answer material or unrevealed private data; private hints and guesses are sent only to the owning authenticated player.

For a local multiplayer session, start PostgreSQL and the backend as described in `../server/README.md`, then start Vite on `http://localhost:5173`. Open three browser sessions (or browser profiles), create a guest in each, create a room in one session, join its code from the other two, mark all players ready, and start the match as host. A two-session room cannot start because the product's existing capacity policy requires at least three players.
