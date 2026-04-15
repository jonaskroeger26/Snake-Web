## Solana Mobile (MWA) manual test checklist

### Prereqs
- **Seeker / Solana Mobile device** with a wallet that supports **Mobile Wallet Adapter**.
- App build: install the Expo wrapper from `dapp-store-app/` (development build or dapp-store build as you normally do).
- Marketplace PWA loads inside the wrapper WebView.
- Wallet has **SOL for fees** and **SKR** (mint `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`) for buys/bids.

### One-time setup (cNFT only)
- Set DAS endpoint (Helius-style) in the JS console:

```js
localStorage.setItem('DAS_RPC_URL', 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY');
// or:
localStorage.setItem('DAS_API_KEY', 'YOUR_KEY');
localStorage.setItem('DAS_RPC_URL', 'https://mainnet.helius-rpc.com/');
```

### Connect + sign sanity
- Open **Profile** → **Connect Wallet**.
- Confirm wallet address shows and balance updates.
- Go to **Market** tab → press **Refresh**.

### NFT fixed-price listing
- Seller wallet: create an NFT listing (enter mint, price).
- Buyer wallet: refresh listings → press **Buy** on that listing.
- Verify:
  - buyer receives the NFT
  - seller receives SKR (minus fee)
  - fee recipient receives fee SKR

### NFT auction
- Seller wallet: create auction (in UI v1 this is not exposed; use a script or CLI for now).
- Bidder wallet: place bid.
- After end time, finalize auction.
- Verify escrow refund + winner receives NFT + seller/fee paid.

### cNFT proof bundle
- In **Market → cNFT helper**, paste an **asset id** and click **Load proof bundle**.
- Verify it displays: tree, index, proof length.

