# Abasthan backend deployment

Configure the backend project with `server/` as its project root. The repository root has no npm package manifest.

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Node version | `20.19` or newer |
| Runtime entry point | `dist/server/src/index.js` (resolved from `server/`) |
| Build output | `server/dist/`; TypeScript uses `rootDir: ..` and `outDir: dist` |
| Health check | `/api/v1/health` |

`npm run build` runs `prisma generate` before TypeScript compilation. Keep the Prisma schema at `prisma/schema.prisma` and install the server's development dependencies during the build so the Prisma CLI and TypeScript compiler are available. The generated client is consumed from `@prisma/client` at runtime. Do not configure a separate static output directory for the backend.

Required runtime environment:

- `DATABASE_URL`: PostgreSQL connection URL stored as a secret.
- `NODE_ENV=production`.
- `COOKIE_SECURE=true`.
- `TRUSTED_ORIGINS`: exact browser origin, currently `https://samcro-game.pages.dev`.
- `SOCKET_PUBLIC_ORIGIN`: public backend origin used by the browser CSP and Socket.IO client.
- `PORT`: use the port injected by Abasthan; the local default is `3001`.
- `TRUSTED_PROXY_CIDRS`: leave unset until Abasthan's actual proxy source CIDRs and forwarding path are confirmed in the service configuration. Then set only those exact CIDRs. The application defaults to zero trusted proxies in every environment and ignores forwarded client addresses until configured. Do not infer a hop count, use broad private-network ranges, or enable permissive `trust proxy: true`.

Prisma migrations are not run by the build or server start command. Apply them only through the separately authorized database release workflow.

## Build failure investigation

An Abasthan deployment has been reported as `BUILD_FAILED`. The workspace contains no Abasthan build log, deployment manifest, configured project root, or captured failing command, so its cause remains unverified. Compare the failed attempt's project root and command with this table, then inspect the first failing build step. A project root at repository root would fail because there is no root `package.json`; a `server/` root matches the checked-in scripts and runtime path. A passing local TypeScript compile does not establish that the Abasthan build or deployment succeeded.
