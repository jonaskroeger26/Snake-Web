# First Time Setup - EAS Build

EAS (Expo Application Services) is Expo's cloud service that builds your app. You need an Expo account (free).

## Step 1: Create Expo Account

1. Go to: **https://expo.dev/signup**
2. Sign up with your email (or GitHub)
3. Remember your password

## Step 2: EAS CLI is already installed locally

You can use `npx eas` instead of `eas` (no need to install globally).

## Step 3: Login to EAS

```bash
npx eas login
```

Enter the email and password from Step 1.

## Step 4: Initialize EAS Project

```bash
cd "/Users/jonaskroeger/Downloads/snake-dapp 2/dapp-store-app"
npx eas init
```

It will ask:
- "Link to existing project?" → Choose **No** (create new)
- It will print a **Project ID** (like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Step 5: Update app.json

1. Open `dapp-store-app/app.json` in Cursor
2. Find: `"projectId": "YOUR_EAS_PROJECT_ID"`
3. Replace `YOUR_EAS_PROJECT_ID` with the Project ID from Step 4
4. Save

## Step 6: Build Development Build

```bash
npx eas build -p android --profile development
```

Wait 10-20 minutes. When done, download the APK and install on your Seeker.

---

**That's it!** After this one-time setup, you can build anytime with `eas build`.
