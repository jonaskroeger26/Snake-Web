# If You See a Black Screen

The Development Build APK you have installed was built earlier. If the app only shows a black screen (even after reload), the WebView native module may not be properly linked in that build.

## Fix: Rebuild the Development Build

1. **Rebuild the APK**
   ```bash
   cd dapp-store-app
   npx eas build -p android --profile development
   ```

2. **Wait** for the build to finish (10–20 min). Get the APK link from the Expo dashboard.

3. **Uninstall** the old "Snake - Solana" app from the emulator or device.

4. **Install** the new APK (download from the build link, then install).

5. **Start Metro** (if you want to use the dev server):
   ```bash
   npx expo start --dev-client --port 8083
   ```

6. **Open** the new app. It will load your PWA from `https://snake-web-phi.vercel.app/` and the WebView should show the Snake game.

## Alternative: Use Production Build for Testing

If you only need to see the game and wallet modal (without connecting to Metro), build the **production** APK and install it:

```bash
npx eas build -p android --profile dapp-store
```

Install that APK. It loads the PWA directly with no dev server. You can test the wallet selection modal and game there.
