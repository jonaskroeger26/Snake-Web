# SolanaPod – Expo EAS Build

This folder is a minimal **Expo** app that loads [SolanaPod](https://solana-pod.vercel.app/) in a WebView. Use it to build an **Android APK** with **Expo EAS Build** (cloud build, no local Android Studio).

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo account](https://expo.dev/signup) (free)
- [EAS CLI](https://docs.expo.dev/build/setup/) (installed with the project)

## First-time setup

1. **Install dependencies**
   ```bash
   cd expo-app
   npm install
   ```

2. **Log in to Expo** (once)
   ```bash
   npx eas login
   ```

3. **Configure the EAS project** (first time only)
   ```bash
   npx eas build:configure
   ```
   When asked, create a new project on Expo or link an existing one.

## Build APK (online, via EAS)

From the `expo-app` folder:

```bash
npx eas build -p android --profile production
```

- Build runs in the **cloud** on Expo’s servers (~10–20 minutes).
- When it finishes, you get a **download link** in the terminal (or open [expo.dev](https://expo.dev) → your project → **Builds**).
- Download the **APK** and install it on your Android device.

## Build profiles (eas.json)

| Profile       | Use case              | Output |
|---------------|------------------------|--------|
| `production`  | Release APK           | APK    |
| `preview`     | Internal testing      | APK    |
| `development` | Dev client + Metro    | APK    |

Example for a preview build:

```bash
npx eas build -p android --profile preview
```

## What this app does

- Opens **https://solana-pod.vercel.app/** in a full-screen WebView.
- Same SolanaPod music player UI; playback runs in the browser inside the app.
- For **background audio** (Spotify-style), use the **Capacitor** build instead (see main [README](../README.md) → Android APK via GitHub Actions or local Capacitor build).

## Scripts

| Command              | Description                    |
|----------------------|--------------------------------|
| `npm run build:apk`  | EAS production APK build      |
| `npm run build:preview` | EAS preview APK build     |
| `npm run start`      | Start Expo dev server         |
| `npm run eas`       | Run EAS CLI                   |
