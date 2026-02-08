# What Broke and How to Continue Developing

## What was working ~2 hours ago

- **Expo start** (e.g. `npx expo start` on port 8082) and opening the project in **Expo Go**.
- You could see the app shell or connection screen.
- The **web PWA** at https://snake-web-phi.vercel.app/ has been working (game + wallet modal).

## What changed / why it broke

1. **Expo Go**  
   The app uses the **Mobile Wallet Adapter (MWA)** for Seeker’s internal wallet. MWA is a **native module**. Expo Go doesn’t include it, so you started seeing:
   - `SolanaMobileWalletAdapter could not be found`
   - That’s expected in Expo Go; it was only “working” before in the sense that the UI appeared, not the wallet.

2. **Development Build (custom APK)**  
   To use MWA we switched to a **Development Build**. After installing that APK and connecting to Metro (`http://10.0.2.2:8083`), the app loaded the JS bundle but the **WebView stayed black** (it never drew the PWA). So:
   - The dev client connection screen worked.
   - The React Native app ran.
   - The WebView that should show https://snake-web-phi.vercel.app/ did not render.
   - We never got that WebView to show content in the dev build, so we stopped relying on it.

3. **No intentional “break” in the PWA**  
   The **web game** in `app/index.html` (and on Vercel) was not broken by these steps. The regression was only in the **native dev workflow** (Expo Go → Dev Build + Metro + black WebView).

## What is still working now

- **PWA (web):**  
  https://snake-web-phi.vercel.app/  
  Game, wallet modal, MWA (when the environment provides it, e.g. Seeker in-app browser). Safe to keep developing here.

- **Repo and build config:**  
  `dapp-store-app/App.js` and `app/index.html` are in a good state: WebView loads `PWA_URL`, MWA bridge is in place, no experimental overlays or test HTML.

## How to continue developing

### Option A: Develop the game and wallet (fastest)

- Edit **`app/index.html`** (and any files in `app/`).
- Test in the browser:
  - Production: https://snake-web-phi.vercel.app/
  - Or locally: from project root run  
    `npx serve app`  
    then open http://localhost:3000 (or the URL shown).
- Deploy to Vercel when ready (e.g. push to GitHub if it’s connected).

No Expo, no dev client, no Metro. This is the path that “was working” for the actual game and wallet flow.

### Option B: Get an APK for the dApp store

- Build the **production** app (no dev client, no Metro):

  ```bash
  cd dapp-store-app
  npx eas build -p android --profile dapp-store
  ```

- Install the downloaded APK on a device. The app will open and the WebView will load https://snake-web-phi.vercel.app/.
- Use that APK for store submission.

### Option C: Fix the Development Build later (optional)

- The black WebView in the dev build is likely due to how the WebView or native stack behaves in that specific build when served from Metro.
- To fix it you’d need to debug the native/WebView layer (e.g. try a new EAS dev build, or run a local Android build with `expo run:android` and inspect WebView).
- Not required for continuing development of the game or for releasing on the dApp store.

## Summary

- **Before it broke:** Expo Go showed the app UI; the real game and wallet flow live in the PWA.
- **What broke:** Using Expo Go with MWA (impossible) and the Development Build showing a black WebView.
- **Continue developing:** Use the **web app** (`app/` + Vercel or `npx serve app`) and, when ready, ship with the **dapp-store** EAS build. No need to reinstall the dev client for day-to-day development.
