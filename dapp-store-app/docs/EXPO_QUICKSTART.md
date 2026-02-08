# Expo quick start – Snake dApp

You’ve never used Expo? Here’s the minimal path to run the app and build an APK for the dApp Store.

## What you need

- **Node.js** (v18 or newer). Check: `node -v`
- **npm** (comes with Node). Check: `npm -v`
- **Android device** or **Android emulator** (for testing)
- **Expo account** (free) – only needed for building the APK in the cloud

---

## 1. Install dependencies

In a terminal, go into the Expo app folder and install:

```bash
cd dapp-store-app
npm install
```

Wait until it finishes (can take a minute).

---

## 2. Run the app on your computer

Start the dev server:

```bash
npx expo start
```

You’ll see a QR code and some shortcuts in the terminal.

- **Press `a`** – opens the app in an Android emulator (if you have one installed).
- **Press `w`** – opens in the browser (limited; WebView content may not work fully).
- **QR code** – scan with the **Expo Go** app on your phone to run the app there.

To use your **physical Android phone**:

1. Install **Expo Go** from the Play Store.
2. Make sure phone and computer are on the same Wi‑Fi.
3. Run `npx expo start` and scan the QR code with your phone (or with the Expo Go in-app scanner).

The app will load and show your game at https://snake-web-phi.vercel.app/ inside the WebView.

Stop the server with **Ctrl+C** when you’re done.

---

## 3. Build an APK for the dApp Store (EAS Build)

Expo’s cloud build (EAS) produces the Android APK you upload to the Solana dApp Store.

### 3.1 Install EAS CLI and log in

```bash
cd dapp-store-app
npm install -g eas-cli
eas login
```

Create an Expo account when prompted (free).

### 3.2 Link the project to EAS (first time only)

```bash
eas build:configure
```

Choose **All** if asked (Android + iOS). That creates/updates `eas.json` (you already have a `dapp-store` profile).

Then link the project to your Expo account:

```bash
eas init
```

Copy the **Project ID** it prints, open `app.json`, and paste it here:

```json
"extra": {
  "eas": {
    "projectId": "paste-the-id-here"
  }
}
```

Save the file.

### 3.3 Build the Android APK

```bash
eas build -p android --profile dapp-store
```

- Confirm the prompts (e.g. “Build for production”).
- The build runs in the cloud (5–15 minutes).
- When it’s done, you get a **link to download the APK**.

Download that APK; it’s the file you’ll upload to the [Solana dApp Publisher Portal](https://publish.solanamobile.com) when submitting to the dApp Store.

---

## Useful commands (cheat sheet)

| What you want              | Command |
|----------------------------|--------|
| Run the app                | `npx expo start` |
| Run and open Android      | `npx expo start --android` |
| Build APK for dApp Store   | `eas build -p android --profile dapp-store` |
| Stop the dev server        | `Ctrl+C` |

---

## If something goes wrong

- **“expo: command not found”** – Use `npx expo start` instead of `expo start`.
- **QR code doesn’t connect** – Same Wi‑Fi for phone and computer; try “Tunnel” in the terminal menu (slower but more reliable).
- **EAS build fails** – Check the build log on [expo.dev](https://expo.dev); fix the error (e.g. missing `projectId` in `app.json`) and run the build again.
- **Game doesn’t load in the app** – Confirm https://snake-web-phi.vercel.app/ works in a normal browser; the app is just a WebView showing that URL.

For more: [Expo docs](https://docs.expo.dev/get-started/introduction/).
