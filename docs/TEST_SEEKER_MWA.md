# Testing Seeker Mobile Wallet Adapter

## 🧪 Quick Test Guide

### Option 1: Test on Seeker Device (Best)

1. **Deploy the PWA** (if not already deployed):
   ```bash
   # Changes are already pushed to GitHub, Vercel should auto-deploy
   # Check: https://snake-web-phi.vercel.app
   ```

2. **Build and install the Expo app**:
   ```bash
   cd dapp-store-app
   npm run build:dapp-store
   ```
   - Get the APK link from EAS
   - Install on your Seeker device

3. **Open the app** on Seeker device

4. **Test connection**:
   - Tap "Connect Wallet" button
   - Select "Mobile Wallet Adapter" (should show Seeker's wallet)
   - Authorize when Seeker prompts
   - ✅ Should see your wallet address displayed

5. **Test in browser console** (if testing PWA directly):
   ```javascript
   // Open browser DevTools → Console
   await window.__snakeWalletAdapter.connect()
   // Should return your wallet address
   
   window.__snakeWalletAdapter.getPublicKey()
   // Should return your address
   
   window.__snakeWalletAdapter.isConnected()
   // Should return true
   ```

---

### Option 2: Test on Android Emulator

**Note**: Emulator doesn't have Seeker's built-in wallet, but you can test the adapter logic.

1. **Start Metro**:
   ```bash
   cd dapp-store-app
   npm start
   ```

2. **Install development build** on emulator:
   - Use the development APK from EAS
   - Or run: `npx expo run:android` (if you have Android Studio setup)

3. **Connect to Metro**:
   - In the app, enter: `http://10.0.2.2:8083`
   - Connect

4. **Test**:
   - Tap "Connect Wallet"
   - Should show error: "No Solana wallet found" (expected on emulator)
   - Or install Phantom wallet APK on emulator to test fallback

---

### Option 3: Test PWA in Browser (Development)

1. **Serve locally**:
   ```bash
   cd app
   python3 -m http.server 8000
   ```

2. **Open**: `http://localhost:8000`

3. **Open DevTools Console**:
   ```javascript
   // Check if adapter loaded
   console.log(window.__snakeWalletAdapter);
   console.log('Ready:', window.__snakeWalletAdapter?.ready);
   
   // Try to connect (will fail without Seeker, but tests the code)
   try {
     await window.__snakeWalletAdapter.connect();
   } catch (e) {
     console.log('Expected error (no Seeker):', e.message);
   }
   ```

---

## ✅ What to Verify

### Connection Test
- [ ] Adapter initializes (`ready: true` in console)
- [ ] "Connect Wallet" button works
- [ ] Seeker authorization prompt appears
- [ ] Wallet address is displayed after connection
- [ ] `isConnected()` returns `true`

### Transaction Test (if you have transactions)
```javascript
// Build a test transaction
const transaction = new solanaWeb3.Transaction().add(
  solanaWeb3.SystemProgram.transfer({
    fromPubkey: new solanaWeb3.PublicKey(address),
    toPubkey: new solanaWeb3.PublicKey('...'),
    lamports: 1000,
  })
);

// Sign and send
const signature = await window.__snakeWalletAdapter.signAndSendTransaction(
  transaction.serialize(),
  { skipPreflight: false }
);
console.log('Transaction sent:', signature);
```

### Console Logs to Check

Look for these in browser/React Native console:

✅ **Success logs**:
```
[Seeker MWA] ✅ Initialized successfully
[Seeker MWA] Connecting to wallet: Mobile Wallet Adapter
[Seeker MWA] ✅ Connected successfully: { wallet: '...', address: '...' }
```

❌ **Error logs** (if something fails):
```
[Seeker MWA] ❌ Connect error: ...
[Seeker MWA] ❌ Initialization failed: ...
```

---

## 🐛 Troubleshooting

### "No Solana wallet found"
- **On Seeker**: Make sure you're using the built-in wallet
- **On emulator**: Install Phantom or another Solana wallet
- **In browser**: Expected - Seeker only works in native app

### Adapter not ready
- Check console for initialization errors
- Verify `mwa-bundle.js` loaded (check Network tab)
- Ensure HTTPS (required for MWA)

### Connection fails
- Check Seeker device is unlocked
- Verify wallet is set up on Seeker
- Check authorization wasn't denied
- Look for detailed error in console

### Transaction signing fails
- Ensure wallet is connected first
- Check transaction is valid
- Verify you have enough SOL for fees
- Check network (devnet vs mainnet)

---

## 📱 Testing Checklist

- [ ] PWA loads and shows wallet button
- [ ] MWA adapter initializes (`ready: true`)
- [ ] Can detect Seeker wallet
- [ ] Connection prompt appears
- [ ] Authorization succeeds
- [ ] Wallet address displays
- [ ] Can disconnect
- [ ] Can reconnect (cached auth)
- [ ] Transaction signing works (if implemented)
- [ ] Error messages are clear

---

## 🚀 Next Steps After Testing

Once basic connection works:

1. **Add transaction building** - Use `@solana/web3.js` to create transactions
2. **Test score submission** - Sign transactions to submit game scores
3. **Add error recovery** - Handle network errors gracefully
4. **Test on multiple devices** - Seeker, emulator, regular Android

---

## 📞 Need Help?

- Check `SEEKER_MWA_GUIDE.md` for detailed API docs
- Review console logs for specific errors
- Test in browser console first (easier debugging)
- Verify Seeker device has wallet set up
