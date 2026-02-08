# Development Build Setup for Seeker Wallet Support

The React Native Mobile Wallet Adapter requires native modules, so you need a **Development Build** (not Expo Go).

## Step 1: Install EAS CLI and Login

```bash
npm install -g eas-cli
eas login
```

## Step 2: Initialize EAS Project

```bash
cd dapp-store-app
eas init
```

Copy the Project ID it gives you, then update `app.json`:
- Find `"projectId": "YOUR_EAS_PROJECT_ID"`
- Replace with the actual Project ID

## Step 3: Build Development Build

```bash
eas build -p android --profile development
```

This will:
- Build an APK with native MWA support
- Take 10-20 minutes
- Give you a download link when done

## Step 4: Install on Your Seeker

1. Download the APK from the EAS build link
2. Transfer to your Seeker phone
3. Install it (enable "Install from unknown sources" if needed)
4. Open the app - it will have a custom Expo dev client

## Step 5: Run the Dev Server

```bash
npm start --dev-client
```

Then scan the QR code with the **custom dev client app** (not Expo Go).

## Alternative: Build for dApp Store Directly

If you just want to test on Seeker and submit to the store:

```bash
eas build -p android --profile dapp-store
```

This builds the production APK you'll submit to the Solana dApp Store.

---

**Note:** Development Builds are required for any app using native modules like Mobile Wallet Adapter. Expo Go only works for apps without custom native code.
