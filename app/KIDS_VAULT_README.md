# Fatherhood — Lock SOL or wBTC for your children

A small **fatherhood-style** crypto app: lock **SOL** or **wBTC** (Wrapped Bitcoin) for your kids until a chosen date. Only the child’s wallet can withdraw after the unlock time.

## How it works

- **You (parent):** Connect your wallet, choose **SOL** or **wBTC**, enter the child’s Solana address, amount, and an unlock date (e.g. 18th birthday).
- **On-chain:** The app creates a time-locked vault (Solana program). Your SOL or wBTC is locked in the vault; nobody can move it until the unlock time.
- **Child:** After the unlock date, only the child’s wallet can call “withdraw” and receive the funds.

## Where to run it

- **Dev:** From repo root run `npm run dev`. The app is served at **http://localhost:5173/** (fatherhood app only; no Snake).
- **Build:** `npm run build` outputs to `dist/` at project root.

## Solana program (Anchor)

- Program: **kids-vault** in `programs/kids-vault/`.
- Instructions:
  - **SOL:** `create_vault(amount_lamports, unlock_timestamp)`, `withdraw()`, `cancel_vault()`.
  - **Tokens (e.g. wBTC):** `create_token_vault(amount, unlock_timestamp)` — lock SPL tokens (mint = wBTC or other); `withdraw_token_vault()` — beneficiary withdraws tokens; `cancel_token_vault()` — creator cancels and gets tokens back.

**Build & deploy (devnet):**

```bash
anchor build
anchor deploy --provider.cluster devnet
```

Program ID is in `Anchor.toml` and `programs/kids-vault/src/lib.rs`. The app uses **devnet** by default; change the RPC in `kids-vault.html` for mainnet. **wBTC** uses the Portal wBTC mint on mainnet (`3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh`); on devnet you may need to use a test SPL mint or point the app at mainnet for wBTC.

## Wallet

The page uses the same wallet setup as the main Snake app: Phantom or the in-app Mobile Wallet Adapter (e.g. Seeker). Connect once to create vaults and see your list.
