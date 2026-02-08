# MWA troubleshooting (from Minty-fresh + official RN example)

Reference: [Minty-fresh](https://github.com/solana-mobile/Minty-fresh) (native Kotlin MWA) and the [official React Native example](https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/examples/example-react-native-app).

## Patterns we use

1. **Authorize params (MWA 2.0)**  
   Use `chain` + `identity` (not deprecated `cluster`):
   - `identity: APP_IDENTITY` (name, uri, icon)
   - `chain: 'solana:mainnet-beta'` for Seeker/production (Minty-fresh uses mainnet for real wallets)

2. **No-wallet handling (Minty-fresh)**  
   They set `noWallet: true` and show "Please install a wallet". We detect `ERROR_WALLET_NOT_FOUND` (or message containing "no installed wallet") and send a clear message to the WebView.

3. **Address format**  
   Protocol returns `accounts[].address` as base64. We decode to bytes then to base58 for display and API (see official RN example’s `getPublicKeyFromAddress`).

4. **Native flow (Minty-fresh)**  
   Kotlin uses `walletAdapter.connect(activityResultSender)` and handles `TransactionResult.Success | NoWalletFound | Failure`. Our RN app uses `transact(wallet => wallet.authorize(...))`; the native module runs the Android association and returns the auth result.

## If connect still fails

- Ensure the app has **one** foreground Activity so the wallet intent can return (Expo/React Native do this).
- On device: **Seeker internal wallet** or another MWA-compatible wallet must be installed.
- Logs: `[Expo]` and `[MWA Bridge]` in Metro / device logs; check for `ERROR_WALLET_NOT_FOUND`, session timeouts, or auth refusals.
