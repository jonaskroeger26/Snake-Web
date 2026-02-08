# Seeker Mobile Wallet Adapter - Complete Guide

This project includes a production-ready Mobile Wallet Adapter (MWA) integration for **Seeker** mobile wallet, following official Solana Mobile patterns.

## 📚 Resources Used

- [Solana Mobile Mastery Course](https://learn.blueshift.gg/en/paths/solana-mobile-mastery)
- [Mobile Wallet Adapter GitHub](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana Mobile GitHub Org](https://github.com/solana-mobile)

## 🏗️ Architecture

### Web (PWA) Layer
- **File**: `app/mwa-entry.js` - Enhanced MWA adapter with full Seeker support
- **Bundle**: `app/mwa-bundle.js` - Bundled for WebView injection
- **Build**: `npm run build:mwa`

### React Native (Expo) Layer
- **File**: `dapp-store-app/App.js` - Bridges MWA between WebView and native Seeker wallet
- **Package**: `@solana-mobile/mobile-wallet-adapter-protocol-web3js`

## ✨ Features

The Seeker MWA adapter provides:

1. **Connect/Disconnect** - Connect to Seeker's built-in wallet
2. **Sign Transactions** - Sign and send Solana transactions
3. **Sign Messages** - Sign arbitrary messages
4. **Auto-reconnect** - Cached authorization for seamless UX
5. **Error Handling** - Comprehensive error messages and logging

## 🚀 Usage

### In Your Web App (PWA)

```javascript
// The adapter is automatically initialized when mwa-bundle.js loads
// Access via window.__snakeWalletAdapter

// Connect to Seeker wallet
const address = await window.__snakeWalletAdapter.connect();
console.log('Connected:', address);

// Check connection status
if (window.__snakeWalletAdapter.isConnected()) {
  const pubkey = window.__snakeWalletAdapter.getPublicKey();
  console.log('Public key:', pubkey);
}

// Sign and send a transaction
const signature = await window.__snakeWalletAdapter.signAndSendTransaction(
  transactionBytes,
  { skipPreflight: false }
);

// Sign a transaction without sending
const signedTx = await window.__snakeWalletAdapter.signTransaction(transactionBytes);

// Sign a message
const messageSig = await window.__snakeWalletAdapter.signMessage(messageBytes);

// Disconnect
await window.__snakeWalletAdapter.disconnect();
```

### In React Native (Expo App)

The Expo app automatically bridges MWA calls from the WebView to the native Seeker wallet:

```javascript
// In App.js, the WebView injects JavaScript that:
// 1. Listens for connect requests from the PWA
// 2. Uses @solana-mobile/mobile-wallet-adapter-protocol-web3js to call Seeker
// 3. Returns the result back to the PWA via postMessage
```

## 🔧 Development

### Rebuild MWA Bundle

After modifying `app/mwa-entry.js`:

```bash
npm run build:mwa
```

This creates `app/mwa-bundle.js` which is loaded by the PWA.

### Testing on Seeker Device

1. **Build Expo app**: `cd dapp-store-app && npm run build:dapp-store`
2. **Install APK** on Seeker device
3. **Open app** - The PWA loads in WebView
4. **Connect wallet** - Tap "Connect Wallet" → Select "Mobile Wallet Adapter"
5. **Authorize** - Seeker will prompt for authorization
6. **Use wallet** - Transactions will be signed by Seeker

### Testing on Emulator/Other Devices

- The adapter falls back to other wallets (Phantom, etc.)
- Or shows helpful error messages if no wallet is found

## 📝 Implementation Details

### Wallet Detection

The adapter prioritizes Seeker's wallet:

1. Looks for wallet named "Mobile Wallet Adapter"
2. Falls back to any wallet with "seeker" or "seed vault" in name
3. Otherwise uses first available Solana wallet

### Authorization Caching

- Uses `createDefaultAuthorizationCache()` for persistent auth
- Attempts silent reconnect on page load
- User only needs to authorize once per session

### Error Handling

All errors include:
- Clear, user-friendly messages
- Console logging for debugging
- Proper cleanup on failure

## 🐛 Troubleshooting

### "No Solana wallet found"

- **On Seeker**: Ensure you're using the built-in wallet
- **On other devices**: Install Phantom or another Solana wallet app

### "Wallet does not support connect"

- The wallet doesn't implement the Wallet Standard
- Try a different wallet or update the wallet app

### Connection fails silently

- Check browser console for detailed error logs
- Ensure HTTPS (required for MWA)
- Verify Seeker device is unlocked and wallet is set up

## 📦 Dependencies

### Web (PWA)
- `@solana-mobile/wallet-standard-mobile@^0.4.1`
- `@wallet-standard/core@^1.0.1`

### React Native (Expo)
- `@solana-mobile/mobile-wallet-adapter-protocol-web3js@^2.2.0`
- `react-native-webview@13.15.0`

## 🎯 Next Steps

1. **Add transaction building** - Use `@solana/web3.js` to build transactions
2. **Add error recovery** - Retry logic for failed transactions
3. **Add transaction history** - Track signed transactions
4. **Add multi-account support** - Support multiple Seeker accounts

## 📄 License

MIT
