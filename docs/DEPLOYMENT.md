# 🚀 Deployment Checklist for Snake Game dApp

## Pre-Deployment

- [ ] Rust and Cargo installed
- [ ] Solana CLI installed and configured
- [ ] Anchor framework installed
- [ ] Phantom wallet installed in browser
- [ ] Wallet funded with SOL (devnet or mainnet)

## Local Testing

- [ ] `anchor build` completes successfully
- [ ] Program compiles without errors
- [ ] Program ID generated (`anchor keys list`)
- [ ] Program ID updated in `lib.rs` and `Anchor.toml`
- [ ] Frontend opens without errors
- [ ] Wallet connection works
- [ ] Game plays correctly

## Devnet Deployment

- [ ] Switch to devnet: `solana config set --url devnet`
- [ ] Airdrop devnet SOL: `solana airdrop 2`
- [ ] Deploy program: `anchor deploy`
- [ ] Verify deployment: `solana program show <PROGRAM_ID>`
- [ ] Test all functions on devnet
- [ ] Initialize leaderboard on devnet
- [ ] Create test player accounts
- [ ] Submit test scores
- [ ] Verify leaderboard updates

## PWA / Android App

The frontend is a Progressive Web App (PWA) and can be installed on Android (and other devices):

- [ ] Serve the `app/` folder over **HTTPS** (required for install; localhost is OK for testing)
- [ ] Ensure the server serves the main HTML for the app root. If you use `index (24).html`, either rename it to `index.html` in `app/` or configure your server to serve it as the default document for the app directory.
- [ ] On Android: open the app URL in Chrome → menu (⋮) → **Install app** or **Add to Home screen**
- [ ] The app will open in standalone mode (no browser UI) and appear in the app drawer

Files added for PWA: `app/manifest.json`, `app/sw.js`, `app/icons/icon.svg`.

## Frontend Testing

- [ ] Update program ID in frontend code
- [ ] Update RPC endpoint to devnet
- [ ] Test wallet connection
- [ ] Test player initialization
- [ ] Play complete game
- [ ] Verify score submission
- [ ] Check leaderboard display
- [ ] Test on different browsers
- [ ] Test mobile responsiveness

## Mainnet Preparation

- [ ] Full security audit completed
- [ ] All devnet tests passing
- [ ] Frontend hosted and accessible
- [ ] Get mainnet SOL for deployment (~5-10 SOL recommended)
- [ ] Backup wallet keypair securely
- [ ] Document program ID and deployment date

## Mainnet Deployment

- [ ] Switch to mainnet: `solana config set --url mainnet-beta`
- [ ] Double-check wallet has enough SOL
- [ ] Deploy to mainnet: `anchor deploy --provider.cluster mainnet`
- [ ] Verify deployment on Solana Explorer
- [ ] Update frontend with mainnet program ID
- [ ] Update frontend RPC to mainnet
- [ ] Initialize mainnet leaderboard
- [ ] Test with real wallet (small amount)
- [ ] Monitor first few transactions

## dApp Store Submission (Solana Mobile)

- [ ] Follow **[DAPP_STORE.md](DAPP_STORE.md)** for Solana dApp Store (Bubblewrap PWA → APK or Expo WebView app)
- [ ] Program verified on-chain
- [ ] Frontend live and functional
- [ ] Prepare assets:
  - [ ] Logo/icon (512x512 PNG)
  - [ ] Screenshots (multiple)
  - [ ] Demo video (optional)
- [ ] Write description
- [ ] List key features
- [ ] Provide links:
  - [ ] Frontend URL
  - [ ] GitHub repository
  - [ ] Documentation
  - [ ] Social media
- [ ] Submit to Solana dApp Store
- [ ] Submit to other directories (DappRadar, etc.)

## Post-Launch

- [ ] Monitor transactions
- [ ] Track user feedback
- [ ] Fix any bugs immediately
- [ ] Engage with community
- [ ] Plan updates/features
- [ ] Marketing and promotion

## Helpful Commands

### Check deployment
```bash
solana program show <PROGRAM_ID>
```

### View account info
```bash
solana account <ACCOUNT_ADDRESS>
```

### Check wallet balance
```bash
solana balance
```

### View recent transactions
```bash
solana transaction-history <WALLET_ADDRESS>
```

### Upgrade program (after initial deployment)
```bash
anchor upgrade <PROGRAM_ID> --program-id <PROGRAM_ID>
```

## Resources

- Solana Explorer: https://explorer.solana.com/
- Devnet Faucet: https://faucet.solana.com/
- Anchor Docs: https://www.anchor-lang.com/
- Solana Docs: https://docs.solana.com/

## Emergency Contacts

- Program Authority: [Your wallet address]
- Deployment Date: [Date]
- Program ID: [After deployment]
- Frontend URL: [After hosting]

---

**Remember**: Test everything thoroughly on devnet before mainnet!
