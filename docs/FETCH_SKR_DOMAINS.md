# Fetch All .skr Domains

This script fetches all `.skr` domains from the Solana blockchain and creates a static lookup file for instant domain resolution.

## 🚀 Quick Start

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Run the fetch script
npm run fetch-skr-domains

# Or directly:
node fetch-all-skr-domains-simple.js
```

## 📋 What It Does

1. **Queries the blockchain** for all `.skr` domain accounts
2. **Extracts wallet addresses** from each domain account
3. **Reverse looks up** domain names using TldParser
4. **Creates `api/skr-lookup.json`** with wallet → domain mappings
5. **Saves progress incrementally** so you can resume if interrupted

## 📁 Output

The script creates: `api/skr-lookup.json`

Format:
```json
{
  "4B3K1Zwvj4TJoEjtWsyKDrFcoQvFoA49nR82Sm2dscgy": "jonaskroeger.skr",
  "AnotherWalletAddress...": "anotherdomain.skr",
  ...
}
```

## ⚡ Usage in API

The API automatically uses this lookup file if it exists. It checks the static lookup **first** (instant) before falling back to blockchain queries.

## 🔄 Updating

Run the script periodically (weekly/monthly) to update the lookup file:

```bash
npm run fetch-skr-domains
```

The script:
- ✅ Loads existing lookup (won't re-fetch known domains)
- ✅ Only processes new accounts
- ✅ Saves progress after each batch
- ✅ Can be interrupted and resumed

## ⚙️ Configuration

Set custom RPC URL (optional):
```bash
SOLANA_RPC_URL=https://your-rpc-url.com node fetch-all-skr-domains-simple.js
```

## 📊 Expected Results

- **Total domains**: ~111,000+ .skr domains
- **Processing time**: ~30-60 minutes (depends on RPC speed)
- **File size**: ~5-10 MB JSON file

## 🚨 Notes

- **RPC Rate Limits**: The script includes delays to avoid rate limiting
- **Resumable**: If interrupted, just run again - it will continue from where it left off
- **Memory**: Large lookups may use significant memory, but JSON file is manageable

## 🎯 Benefits

- ⚡ **Instant lookups** - No RPC calls needed
- 💰 **Free** - Zero ongoing costs
- 🎯 **Works for ALL Seeker users** - Complete database
- 🔄 **Update weekly** - Domains don't change often
