# Solana dApp Store – Release Guide

The Solana dApp Store accepts **Android apps** and **web apps** (PWAs). You can ship Snake in two ways:

1. **PWA → APK (Bubblewrap / TWA)** – Turn your existing PWA into an Android APK. No Expo/Kotlin/Flutter.
2. **Expo (React Native)** – Use the included Expo app that wraps your PWA in a WebView and build an APK with EAS.

Both produce a signed APK you submit at [publish.solanamobile.com](https://publish.solanamobile.com).

---

## Before you start

- [ ] PWA is **hosted over HTTPS**. (Yours: **https://snake-web-phi.vercel.app/**)
- [ ] Manifest is reachable: **https://snake-web-phi.vercel.app/manifest.json**
- [ ] Solana wallet (e.g. Phantom) with ~0.2 SOL for submission.
- [ ] Reviewed [Publisher Policy](https://docs.solanamobile.com/dapp-publishing/publisher-policy) and [Developer Agreement](https://docs.solanamobile.com/dapp-publishing/agreement).

---

## Option 1: PWA → APK with Bubblewrap (recommended)

This packages your PWA as an Android app using a Trusted Web Activity (TWA). No React Native/Expo/Flutter/Kotlin required.

### 1. Manifest and icons

- Your `app/manifest.json` already has `name`, `short_name`, `display`, `theme_color`, `background_color`, and `start_url`.
- For TWA, the store expects **PNG** launcher icons. Add 192×192 and 512×512 PNGs:
  - Export from `app/icons/icon.svg` (e.g. [CloudConvert](https://cloudconvert.com/svg-to-png), or `rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png`).
  - Save as `app/icons/android-chrome-192x192.png` and `app/icons/android-chrome-512x512.png`.
- In `app/manifest.json`, add these entries to the `icons` array (keep your existing SVG if you like):

```json
{
  "src": "icons/android-chrome-192x192.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "any"
},
{
  "src": "icons/android-chrome-512x512.png",
  "sizes": "512x512",
  "type": "image/png",
  "purpose": "any"
}
```

- Ensure the server serves your game when opening the app root (e.g. default document `index.html` in `app/`).

### 2. Install Bubblewrap CLI

```bash
npm i -g @bubblewrap/cli
```

Requires Node 14.15+.

### 3. Initialize TWA project

In a **new directory** (e.g. `snake-twa`):

```bash
bubblewrap init --manifest https://snake-web-phi.vercel.app/manifest.json
```

Use the **full URL** to your deployed manifest. Bubblewrap will ask for:

- Domain and path (where the PWA is hosted)
- Display mode and status bar
- Splash screen and icons
- Keystore location and password (create a new keystore and **store it safely**; you need it for all future updates)

This creates `twa-manifest.json` and Android project files. Commit only `twa-manifest.json` if you use Git.

### 4. Supported languages (required)

In the generated Android project, edit `build.gradle` and add under `android { defaultConfig { ... } }`:

```gradle
resConfigs "en"   // add any other locales your app supports
```

### 5. Build signed APK

```bash
bubblewrap build
```

You get a **signed release APK** (e.g. `app-release-signed.apk`).

### 6. Digital Asset Links (fullscreen, no browser UI)

So the app opens fullscreen without the Chrome URL bar:

1. Get SHA256 of your keystore:
   ```bash
   keytool -list -v -keystore android.keystore
   ```
2. Add it to the TWA manifest:
   ```bash
   bubblewrap fingerprint add <SHA256_FINGERPRINT>
   ```
3. Generate the file:
   ```bash
   bubblewrap fingerprint generateAssetLinks
   ```
4. Host the generated `assetlinks.json` at:
   **https://snake-web-phi.vercel.app/.well-known/assetlinks.json**

   On Vercel: add a file `public/.well-known/assetlinks.json` (or `app/.well-known/assetlinks.json` if your app is in `app/`) and deploy so this URL is publicly reachable.

### 7. Submit to the dApp Store

- Go to [Solana dApp Publisher Portal](https://publish.solanamobile.com).
- Sign up, complete KYC, connect publisher wallet, set storage provider (e.g. ArDrive).
- Add a new dApp, fill metadata (name, description, screenshots, icon).
- Submit a new version and upload your **signed APK**.
- Sign the requested transactions; after review (typically 2–5 days) the app goes live.

Details: [Submit a New App](https://docs.solanamobile.com/dapp-publishing/submit-new-app).

---

## Option 2: Expo (React Native) WebView app

The repo includes an Expo app in `dapp-store-app/` that loads your PWA in a WebView. Use this if you want to ship under the “Expo / React Native” framework.

### 1. Set your PWA URL

`dapp-store-app/App.js` is already set to your live URL:

```js
const PWA_URL = 'https://snake-web-phi.vercel.app/';
```

Change it only if you deploy to a different URL.

### 2. Install and run locally

```bash
cd dapp-store-app
npm install
npx expo start
```

Test on an Android device/emulator.

### 3. Build APK for the dApp Store

EAS is configured with a `dapp-store` profile that builds an **APK** (required by the store, not AAB).

```bash
cd dapp-store-app
npx eas build -p android --profile dapp-store
```

When the build finishes, download the APK from the EAS dashboard.

### 4. Sign the APK (if needed)

If EAS gives you an unsigned APK, sign it locally (see [Building a release APK with Expo](https://docs.solanamobile.com/dapp-publishing/building-expo-apk)):

- Install JDK and Android Studio, install build-tools (e.g. `sdkmanager "build-tools;34.0.0"`).
- Create a keystore:  
  `keytool -genkey -v -keystore release-key.keystore -alias snake -keyalg RSA -keysize 2048 -validity 50000`
- Sign:  
  `$ANDROID_HOME/build-tools/34.0.0/apksigner sign --ks ./release-key.keystore --ks-key-alias snake --out snake-signed.apk snake-unsigned.apk`

Use the **signed** APK for submission.

### 5. Submit to the dApp Store

Same as Option 1: [publish.solanamobile.com](https://publish.solanamobile.com) → Add dApp → New version → Upload APK → complete signing and submission.

---

## Kotlin / Flutter

The store supports **Android** apps in general. If you prefer:

- **Kotlin**: Create an Android app (e.g. with a WebView or Compose) that loads your PWA URL, then build and sign an APK and submit the same way.
- **Flutter**: Use `webview_flutter` (or similar) to load your PWA URL, build an APK, sign it, and submit.

Submission steps are the same: signed APK + metadata in the [Publisher Portal](https://publish.solanamobile.com).

---

## Summary

| Path              | When to use it                         | Output        |
|-------------------|----------------------------------------|---------------|
| **Bubblewrap**    | You only have a PWA, want minimal setup | Signed APK    |
| **Expo**          | You want an “Expo / React Native” build | APK via EAS   |
| **Kotlin/Flutter**| You want a native or custom shell       | APK from IDE  |

All paths end at: **Signed APK → Publisher Portal → Submit → Review → Live on dApp Store.**

For questions or review issues: [Solana Mobile Discord](https://discord.gg/solanamobile) → `#dapp-store`.
