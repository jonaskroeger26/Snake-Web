# Start here – Get Snake on the dApp Store

One path. Do the steps in order. Don’t worry about the other docs until you need them.

---

## Part 1: See the app on your phone (5 min)

### Step 1.1 – Open a terminal

- On Mac: **Terminal** app, or in Cursor: **Terminal → New Terminal**.

### Step 1.2 – Go to the Expo app folder

Copy and paste this, then press Enter:

```bash
cd "/Users/jonaskroeger/Downloads/snake-dapp 2/dapp-store-app"
```

### Step 1.3 – Install stuff

Paste this and press Enter:

```bash
npm install
```

Wait until it finishes (no red errors). Can take 1–2 minutes.

### Step 1.4 – Start the app

Paste this and press Enter:

```bash
npx expo start
```

You should see a **QR code** in the terminal and a line like “Metro waiting on…”.

### Step 1.5 – Open it on your Android phone

1. On your phone, open the **Play Store** and install **Expo Go**.
2. Make sure your **phone and computer are on the same Wi‑Fi**.
3. Open **Expo Go** on the phone and tap **“Scan QR code”**.
4. Point the camera at the **QR code in your terminal** (or in the browser tab that may have opened).

The Snake game should open inside Expo Go. You’re not lost—that’s your app.

To stop the app on your computer: press **Ctrl+C** in the terminal.

---

## Part 2: Build the APK for the dApp Store (one-time setup + build)

You only need this when you’re ready to submit to the Solana dApp Store.

### Step 2.1 – Create an Expo account

1. Go to: **https://expo.dev/signup**
2. Sign up (email or GitHub). It’s free.

### Step 2.2 – Install the build tool and log in

In the same terminal (in `dapp-store-app`), run:

```bash
npm install -g eas-cli
eas login
```

Use the **same email and password** as your Expo account. When it says “Logged in”, you’re good.

### Step 2.3 – Connect this project to your account

Still in `dapp-store-app`, run:

```bash
eas init
```

It will ask something like “Link to existing project?” – choose **No** (or the option that creates a new project). It will print a **Project ID** (looks like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

**Copy that ID.** Then:

1. In Cursor, open the file: **dapp-store-app/app.json**
2. Find the line: `"projectId": "YOUR_EAS_PROJECT_ID"`
3. Replace `YOUR_EAS_PROJECT_ID` with the ID you copied (keep the quotes).
4. Save the file.

### Step 2.4 – Build the Android APK

In the terminal (still in `dapp-store-app`), run:

```bash
eas build -p android --profile dapp-store
```

Answer the prompts (you can accept the defaults). The build runs **on Expo’s servers** (not your computer). It can take **10–20 minutes**.

When it’s done, it gives you a **link**. Open that link in your browser and **download the .apk file**. That file is what you upload to the dApp Store.

### Step 2.5 – Submit to the Solana dApp Store

1. Go to: **https://publish.solanamobile.com**
2. Sign up / log in, connect your Solana wallet (e.g. Phantom), have a bit of SOL (~0.2) for fees.
3. Add your dApp (name, description, screenshots, etc.).
4. When they ask for the **APK**, upload the **.apk file** you downloaded in Step 2.4.
5. Finish the steps they show. After review, your game goes live on the store.

---

## If you get stuck

- **“command not found” or “npm not found”**  
  You need Node.js. Install from https://nodejs.org (LTS version), then try again from Step 1.2.

- **QR code doesn’t work**  
  Phone and computer must be on the **same Wi‑Fi**. In the terminal where Expo is running, press **`s`** to switch to “tunnel” mode and try scanning again.

- **Build fails at “projectId”**  
  You didn’t paste the Project ID into `app.json` in Step 2.3. Open **dapp-store-app/app.json**, fix the `projectId` line, save, and run the build again.

- **Anything else**  
  Tell me exactly what you did, what you saw (or the error message), and I’ll give you the next step.

---

## Summary

| What you want              | Where to look        |
|----------------------------|----------------------|
| Run the app on my phone    | Part 1              |
| Get the APK for the store  | Part 2               |
| Upload to Solana dApp Store| Part 2, Step 2.5     |

Start with **Part 1**. When that works, you’re not lost—you’re on the right path.
