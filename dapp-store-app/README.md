# Snake – Solana dApp Store (Expo)

Expo app that wraps the Snake PWA in a WebView for submission to the **Solana dApp Store** under the Expo / React Native track.

## Setup

1. **PWA URL** in `App.js` is set to `https://snake-web-phi.vercel.app/`. Change it if you deploy elsewhere.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Replace placeholder icons** (optional but recommended for store listing):
   - Add `assets/icon.png` (1024×1024)
   - Add `assets/adaptive-icon.png` (1024×1024)
   - Add `assets/splash.png` (e.g. 1284×2778)
   You can export these from `../app/icons/icon.svg`.

4. **Link EAS project** (for cloud builds):
   ```bash
   npx eas init
   ```
   Then set the returned `projectId` in `app.json` under `expo.extra.eas.projectId`, or remove the `extra.eas` block if you only build locally.

## Run locally

```bash
npx expo start
```

Then press `a` for Android or scan the QR code.

## Build APK for dApp Store

```bash
npx eas build -p android --profile dapp-store
```

Download the APK from the EAS dashboard. If the store requires a locally signed APK, sign it with your release keystore (see [DAPP_STORE.md](../docs/DAPP_STORE.md)).

## Submit

Upload the signed APK at [publish.solanamobile.com](https://publish.solanamobile.com). Full steps are in the root [DAPP_STORE.md](../docs/DAPP_STORE.md).
