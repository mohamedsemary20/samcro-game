# Samkaro web, mobile, and local multiplayer

## Repository architecture

The existing Vite web app remains in `web/`. The Express, Socket.IO, Prisma, and PostgreSQL backend remains in `server/`. The native React Native app is in `mobile/`, and portable contracts, game rules, LAN protocol, and question validation live in `packages/game-core/`. The existing `app/` Android Compose fixture is preserved.

The existing server game engine was extracted into `packages/game-core/engine.ts`, with server compatibility re-exports. Its deterministic scoring, betting, and ledger rules are shared by online server code and the offline host authority. Online games remain server-authoritative. Offline games use a separate in-memory host authority that runs those same portable rules; clients submit actions and receive player-projected snapshots.

## Online mobile integration

The mobile client uses the existing API and Socket.IO contracts:

- `POST /api/v1/sessions/native` creates a guest bearer session.
- `GET /api/v1/sessions/me` restores its player identity.
- Existing room, game, result, leaderboard, and history endpoints back the remaining screens.
- REST sends `Authorization: Bearer`; Socket.IO sends the credential in `handshake.auth.sessionToken` and rejoins on reconnect.

Native credentials are stored with Expo SecureStore. The existing web HttpOnly-cookie flow is unchanged. Guest identity is used because the backend has no account-registration contract. The mobile room and game screens use the existing server event names and server-side validation for readiness, bets, hints, loans, guesses, deadlines, balances, and results.

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to the backend `/api/v1` URL. The example URL is for the Android emulator; physical phones need a backend address reachable on their network. Set `EXPO_PUBLIC_SOCKET_ORIGIN` only when Socket.IO has a different origin.

## Android local rooms

`mobile/modules/samkaro-lan/` is a real Expo Kotlin module built on Java-WebSocket. It binds an ephemeral port on `0.0.0.0`, discovers usable IPv4 addresses from Android network state and active interfaces, accepts multiple peers, emits connection/message events to React Native, and closes cleanly when the host stops or the native module is destroyed. The native server bounds frames to 64 KiB, limits each client to 20 messages per second with a 60-message burst, and uses a 30-second WebSocket liveness timeout.

The host generates a versioned QR payload with a local IPv4 address, port, room code, and random join credential that expires after 20 minutes. No production token is included. A successful join receives a private resume credential that is stored on that device in SecureStore. The LAN protocol validates each frame, scopes credentials to a room, sequences authoritative snapshots, rejects stale or duplicate actions, checks turn ownership, and supports resume after a socket disconnect. Client reconnect uses bounded backoff. Answers and other players' private hints are omitted from recipient snapshots.

The host process currently runs only while the app process is alive and the app stays in the foreground. The host screen holds a wake lock and explains this requirement. There is no foreground service, so Android may stop the room if the app is backgrounded or killed; players then see the host disconnect. Do not treat this as background hosting.

The module declares only internet, network-state, and Wi-Fi-state permissions. Generated Android config currently targets SDK 36. Before raising the target to API 37, review Android's [local network permission requirements](https://developer.android.com/privacy-and-security/local-network-permission). Local traffic uses `ws://` on the phone's LAN, so Android's generated app config allows cleartext traffic; the app does not send its online bearer credential over that local transport.

This is a native-client feature. A browser/PWA is not promised to discover or join these local rooms.

## Offline game and question data

`LocalMatchAuthority` keeps the match state, answer key, hints, betting, loans, timers, settlements, and leaderboard on the host. It uses the existing five-round engine and rejects starts unless the host and all players are ready and at least five approved questions are bundled. A lobby can still be created and joined while the pack is empty; the start action stays disabled.

The versioned bundle at `mobile/assets/offline-questions.json` is empty because the current source review contains 169 candidates but zero approved records. All 169 still need answer fact checks and hint rewrites; the review also flags 14 near-duplicate pairs. The exporter requires explicit approval, current source fingerprints, HTTPS fact-check sources, complete hint review, and a non-leaking hint decision. It does not invent questions or alter the source bank. See [`mobile/OFFLINE-QUESTION-APPROVAL.md`](mobile/OFFLINE-QUESTION-APPROVAL.md).

After the editorial review is complete, run `npm run questions:export-mobile` and `npm run questions:check-mobile` from `server/`. The app validates the packaged schema locally and reports the exact approved count. Offline match completion is implemented in the host authority and exercised with synthetic test fixtures, but real offline play remains unavailable until five eligible questions are approved and bundled.

## Setup and builds

Requirements: Node.js 20.19+, npm 10+, JDK 21, Android SDK platform/build tools matching the generated project, and a development build. Expo Go cannot load the custom LAN module.

From `mobile/`:

```powershell
npm.cmd install
npx.cmd expo install --check
npx.cmd expo prebuild --platform android
npm.cmd run android
npm.cmd start
```

For an APK after the development toolchain is installed:

```powershell
cd android
./gradlew.bat assembleDebug
```

The debug APK is written to `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Do not use the debug signing key for release distribution. `mobile/android/` is generated by Expo prebuild and is ignored by Git.

## Test and device status

The portable core suite covers question-pack eligibility, the five-round match, readiness, answer privacy, action validation, timers, loans, reconnection, and duplicate/stale action rejection. `server/test/localLan.integration.test.ts` runs one host plus three client WebSockets over loopback, including full match convergence. It does not exercise Android's native socket implementation, Wi-Fi routing, a hotspot, or internet-disabled phones.

Mobile component tests cover authentication/API contracts, room create/join, QR parsing, client snapshot/reconnect handling, native bridge shape, offline lobby/action/status/results UI. The Android JS export verifies Metro can bundle the workspace-shared TypeScript sources.

No physical Android devices are available in this environment. Therefore QR scanning between phones, hotspot connectivity with internet disabled, and a native Android multi-device match are unverified. A reproducible check is: install the debug app on four Android phones; put three clients on the host phone's hotspot; turn off mobile data and other internet access; create a room on the host; scan its QR from each client; set all four ready; play through all five rounds; disconnect and reconnect one client; close the host room and confirm clients receive the shutdown. This test must be run after the approved pack has at least five questions.

iOS online screens are present, but local networking is Android-only and iOS LAN permissions, hosting, background behavior, builds, and physical-device behavior are untested. No browser-to-native-host support is claimed.
