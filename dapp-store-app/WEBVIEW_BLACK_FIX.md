# WebView black screen – fixes applied

## 1. Edge-to-edge disabled (requires native rebuild)

**Cause:** With `edgeToEdgeEnabled=true`, the app draws behind system bars. On many devices this leads to wrong insets/layout for the WebView, so it can render as a black area or with zero height.

**Change:** In `android/gradle.properties`:
- `edgeToEdgeEnabled=false`
- `expo.edgeToEdgeEnabled=false`

**You must create a new development build** for this to take effect (JS-only reload is not enough):

```bash
cd dapp-store-app
npm run build:dev
```

Then install the new APK from EAS and run the app again.

## 2. WebView layout and props

- Layout uses **flex only** (no absolute positioning or fixed `Dimensions`), so the WebView gets a valid size from the flex container.
- **Removed** `androidLayerType="software"` so the default hardware-accelerated layer is used.
- Removed the 100ms delay and extra props that were not helping.

## 3. Test that the WebView can render

If the screen is still black after a **new native build**:

1. In `App.js`, set:
   ```js
   const TEST_WEBVIEW_WITH_HTML = true;
   ```
2. Reload the app (Metro / dev client).

- If you see **“WebView OK”**: the WebView works; the problem is likely the PWA URL (e.g. redirects, mixed content, or JS errors in the page).
- If it stays **black**: the issue is still in the native/layout side; next step is to try a new EAS build with these changes and, if needed, test on a different device or emulator.

After testing, set `TEST_WEBVIEW_WITH_HTML = false` again.
