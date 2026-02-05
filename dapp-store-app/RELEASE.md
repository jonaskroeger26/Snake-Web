# Release on Solana dApp Store

One path to a working APK you can submit.

## 1. Build the APK

In Terminal:

```bash
cd "/Users/jonaskroeger/Downloads/snake-dapp 2/dapp-store-app"
npx eas build -p android --profile dapp-store
```

- Log in with your Expo account if asked.
- Wait 10–20 minutes.
- When it finishes, open the build link (or [expo.dev](https://expo.dev) → your project → Builds) and **download the APK**.

## 2. Install and test

- Copy the APK to your Android phone (or use the download link on the phone).
- Install it (allow “Install from unknown sources” if prompted).
- Open **Snake - Solana**. It will load your game from https://snake-web-phi.vercel.app/
- Play and tap **CONNECT WALLET** to test the wallet selection modal and Seeker/Phantom.

No Metro, no dev server, no dev client — just the app and the internet.

## 3. Submit to the dApp Store

- Go to [publish.solanamobile.com](https://publish.solanamobile.com).
- Sign in and create a new app (or use existing).
- Upload the **same APK** you downloaded from EAS.
- Fill in name, description, category, etc. Use **Expo / React Native** as the framework if asked.
- Submit for review.

## If the store wants a different format

Some stores accept **AAB** (Android App Bundle) instead of APK. To build an AAB:

In `dapp-store-app/eas.json`, change the `dapp-store` profile to:

```json
"dapp-store": {
  "channel": "production",
  "android": {
    "buildType": "app-bundle"
  }
}
```

Then run the same build command; EAS will give you an AAB to download and upload.

---

**Summary:** `npx eas build -p android --profile dapp-store` → download APK → install → test → submit at publish.solanamobile.com.
