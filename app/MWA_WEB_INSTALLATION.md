# Mobile Wallet Adapter (Web) – Installation

This project uses the **Mobile Wallet Standard** as described in the official Solana Mobile docs:

**[Installing Mobile Wallet Standard | Solana Mobile Docs](https://docs.solanamobile.com/mobile-wallet-adapter/web-installation)**

## What we use

1. **Package**: `@solana-mobile/wallet-standard-mobile` (and `@wallet-standard/core`).
2. **Registration**: `registerMwa()` is called in `app/mwa-entry.js` with:
   - `appIdentity`: app name, URI, icon
   - `authorizationCache`: `createDefaultAuthorizationCache()`
   - `chains`: `['solana:devnet', 'solana:mainnet']`
   - `chainSelector`: `createDefaultChainSelector()`
   - `onWalletNotFound`: `createDefaultWalletNotFoundHandler()`

3. **Build**: The entry is bundled for the browser:
   - Source: `app/mwa-entry.js`
   - Output: `app/mwa-bundle.js`
   - Command: `npm run build:mwa` (runs `build-mwa.cjs` from repo root)

4. **Loading**: The PWA includes `mwa-bundle.js` in `index.html` (and `app/index.html` / `app/index (24).html`). The bundle runs in a non-SSR context (plain HTML/script), as recommended in the docs.

## Behavior (from docs)

- **Mobile**: Local connection via Android Intents (same as native Android apps).
- **Desktop**: Not available yet (future: remote connection via QR if `remoteHostAuthority` is provided).

## Rebuilding the MWA bundle

After changing `app/mwa-entry.js` or updating `@solana-mobile/wallet-standard-mobile`:

```bash
npm install
npm run build:mwa
```

Then commit `app/mwa-bundle.js` if you deploy the built file.
