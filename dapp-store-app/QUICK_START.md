# Quick Start - Build Development Build for Seeker

The MWA library needs native code, so you need a **Development Build** (not Expo Go).

## Quick Steps:

1. **Make sure you're logged into EAS:**
   ```bash
   cd dapp-store-app
   eas login
   ```

2. **Initialize EAS project** (if not done):
   ```bash
   eas init
   ```
   Copy the Project ID and update `app.json` → `extra.eas.projectId`

3. **Build Development Build:**
   ```bash
   eas build -p android --profile development
   ```
   Wait 10-20 minutes, then download the APK.

4. **Install on Seeker:**
   - Transfer APK to phone
   - Install it (enable "Install from unknown sources")
   - Open the app (it's a custom Expo dev client)

5. **Run dev server:**
   ```bash
   npm start --dev-client
   ```
   Scan QR code with the **custom dev client app** (not Expo Go).

---

**Or skip testing and build for store directly:**
```bash
eas build -p android --profile dapp-store
```
This builds the APK you'll submit to the Solana dApp Store.
