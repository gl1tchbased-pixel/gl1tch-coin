# GL1TCH for Android (prototype)

A proof of concept for the Solana Mobile proposal in the [grant deck](https://gl1tchbased.xyz/deck): the GL1TCH
token safety scanner as a mobile-first Android app. MIT-licensed, like the rest of the repo.

## What it does

- **Scan by paste.** Paste a token address or any link that contains one, get the verdict, the 0–100 score and a
  plain-language reason for every check. It calls the same free public API as the website
  (`https://gl1tchbased.xyz/api/scan`, no key).
- **Scan from the share sheet.** Share a Pump.fun, Solscan, X or Telegram link (or any text with an address) from
  any app to GL1TCH and it scans on arrival.
- **Scan your wallet, read-only.** Connect a wallet over Mobile Wallet Adapter; the app lists every token you hold
  and risk-checks them one tap at a time.
- **Scan a QR code.** Point the camera at a QR code with a token address, a link that contains one, or a Solana Pay
  code (it reads the `spl-token` mint, not the payee wallet). The camera is used only on that screen; nothing is recorded.
- **Recent scans.** The last 20 verdicts are saved on the phone only (AsyncStorage) and can be reopened without a
  network call. Nothing is uploaded.
- **Watchtower alerts (not yet tested on a phone).** Tap "Watch this token" on a verdict (up to 10 tokens). The app
  re-checks them in the background about every hour, whenever Android's WorkManager allows it, and shows a local
  notification when one gets riskier: a worse verdict, a check that slid pass → warn → fail, or an LP lock that
  dropped 20+ points (the same rules as the Telegram bot's Watchtower; `src/watch-rules.ts`, unit-tested). A timed-out
  source never counts as a change. The watchlist stays on the phone, there is no push server or account, and the
  background re-checks are tagged as automated, so they don't count as people's scans on /api/stats. "Check now"
  runs the same check on demand. Force-stopping the app pauses the checks until it is opened again.
- **Prove ownership without a transaction.** "Sign in with Solana" asks the wallet to sign a short message (on
  Seeker, the Seed Vault-backed wallet signs it). It's used to tie Watchtower alerts to your own wallet.

GL1TCH never requests a transaction signature, never holds keys and never moves funds.

## Status (22 Oct 2026)

Every feature above was tested end to end on a real Android 16 phone with Phantom:

- A Pump.fun link shared from another app opened GL1TCH, the address was extracted and the scan returned the full
  verdict with a reason per check.
- "Connect wallet" connected over Mobile Wallet Adapter, listed the wallet's tokens and "Scan all" scanned them.
- "Sign in with Solana" returned a signed message (no transaction), and the app marked ownership as verified.

Token holdings are read from the official public RPC first; some free endpoints now refuse token-account lookups
without a key, and the app reports that as an error instead of "no tokens".

QR scanning and recent scans were tested on the same phone on 11 Nov 2026 (release APK built by the `mobile-apk`
workflow): a Solana Pay QR code scanned the `spl-token` mint (BONK), not the payee wallet, and the recent-scans
list survived an app restart.

## Not in this prototype yet

Planned in the grant milestones: server-sent push alerts tied to your own wallet's holdings (today's alerts come
from the on-phone watchlist), Seeker polish and the Solana dApp Store release.

## Build

Requires Node.js, JDK 17+ and the Android SDK (API 36, NDK 27.1.12297006).

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease     # APK in android/app/build/outputs/apk/release/
```

`plugins/with-android-build-tweaks.js` keeps two settings across prebuilds: Kotlin compiles inside the Gradle
daemon, and network timeouts are long (helps behind HTTPS-scanning proxies or antivirus). `patches/` removes the
Mobile Wallet Adapter library's own `buildscript`, whose AGP/Kotlin versions clash with React Native 0.86's.

**Release signing.** CI (`.github/workflows/mobile-apk.yml`) builds every APK. When the repo secrets
`ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD` exist, it re-signs the APK with the GL1TCH release key and,
on a push to main, publishes it to the
[android-latest release](https://github.com/gl1tchbased-pixel/gl1tch-coin/releases/tag/android-latest). Without the
key, the APK keeps the Expo template's public debug key and is never published. The key is created once with
`pwsh mobile/scripts/create-signing-key.ps1` (backup stays on the maintainer's PC; nothing is committed).

`npx tsc --noEmit` type-checks the app. The share sheet and Mobile Wallet Adapter use native modules, so the app
needs a development or release build; Expo Go can't run them.

## Layout

| File | What it is |
| --- | --- |
| `App.tsx` | The screen: paste, share-sheet handling, verdict card, wallet section |
| `src/scan.ts` | Scan API client and address extraction from pasted or shared text |
| `src/QrScanner.tsx` | Full-screen QR reader (expo-camera), QR codes only |
| `src/history.ts` | Recent scans saved on the phone |
| `src/wallet.ts` | Read-only Mobile Wallet Adapter connection, Sign in with Solana, token holdings over RPC |
