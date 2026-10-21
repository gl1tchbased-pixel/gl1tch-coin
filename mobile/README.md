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
- **Prove ownership without a transaction.** "Sign in with Solana" asks the wallet to sign a short message (on
  Seeker, the Seed Vault-backed wallet signs it). It's used to tie Watchtower alerts to your own wallet.

GL1TCH never requests a transaction signature, never holds keys and never moves funds.

## Status (21 Oct 2026)

- A release APK builds from this folder (see below).
- **Tested on a real Android 16 phone:** a Pump.fun link shared from another app opened GL1TCH, the address was
  extracted and the scan returned the full verdict with a reason per check.
- **Mobile Wallet Adapter:** "Connect wallet" opens Phantom on the same phone. The full connect → holdings → scan
  flow and Sign in with Solana still need an end-to-end run with the wallet owner approving.

## Not in this prototype yet

Planned in the grant milestones: Watchtower push alerts, QR scanning, an offline verdict cache, Seeker polish and
the Solana dApp Store release.

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

`npx tsc --noEmit` type-checks the app. The share sheet and Mobile Wallet Adapter use native modules, so the app
needs a development or release build; Expo Go can't run them.

## Layout

| File | What it is |
| --- | --- |
| `App.tsx` | The screen: paste, share-sheet handling, verdict card, wallet section |
| `src/scan.ts` | Scan API client and address extraction from pasted or shared text |
| `src/wallet.ts` | Read-only Mobile Wallet Adapter connection, Sign in with Solana, token holdings over RPC |
