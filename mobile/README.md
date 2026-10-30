# Samkaro Mobile

Native Expo Router client for Samkaro. The existing React/Vite web app remains separate and is not wrapped in a WebView.

## Requirements and setup

- Node.js 20.19 or newer and npm 10 or newer.
- JDK 21 and Android SDK components required by the generated Gradle project.
- Android Studio or command-line SDK tools, plus an Android device/emulator for installation.
- A Samkaro API reachable at `EXPO_PUBLIC_API_BASE_URL` for online play.

Copy `.env.example` to `.env` and set the API address. `10.0.2.2` is the Android emulator alias; a physical device needs an address it can reach. Do not commit `.env`.

```powershell
npm.cmd install
npx.cmd expo install --check
npx.cmd expo prebuild --platform android
npm.cmd run android
npm.cmd start
```

Expo Go is not the target runtime because local hosting uses the custom Kotlin module. The module is autolinked by Expo prebuild. The local Android server runs in the app process and requires the host to keep Samkaro foregrounded; background hosting is not supported.

## Features

- Guest sign-in, bearer authentication, online room create/join, lobby, game, results, leaderboard, and profile history use the existing server contracts.
- Offline Party includes Android room hosting, QR/manual joining, local lobby/readiness, connection state, game action controls, reconnect, and results UI.
- Local game state and outcomes are authoritative on the host. The WebSocket protocol uses short-lived join credentials and private resume credentials.
- Shared portable game rules and question validation live in `../packages/game-core`.
- Arabic RTL typography uses the checked-in Tajawal and Cairo font files.

The current approved offline question count is zero. Room creation and joining are available, but match start remains disabled until the editorial process approves at least five eligible questions. Review the blockers in [`OFFLINE-QUESTION-APPROVAL.md`](OFFLINE-QUESTION-APPROVAL.md).

## Verification and platform limits

From this directory, run `npm.cmd run typecheck`, `npm.cmd test`, `npx.cmd expo install --check`, and `npx.cmd expo export --platform android`. For a debug APK use `cd android; ./gradlew.bat assembleDebug`; the APK appears under `android/app/build/outputs/apk/debug/`.

No real-device Wi-Fi/hotspot validation has been performed. iOS local networking and background hosting are not implemented or claimed. See [`../PLATFORM-EVOLUTION.md`](../PLATFORM-EVOLUTION.md) for architecture, review status, and the manual four-device test procedure.
