# 🐍 Snake – Solana dApp

Classic Snake as a Solana dApp: PWA + optional Android app (Expo/WebView) for the Solana dApp Store. Connects with Seeker / Seed Vault or Phantom; leaderboard stored in Supabase.

## 🎮 Features

- **Snake gameplay** – Multiple modes (Classic, Walls, Portal, Speed, Survival), difficulty levels, snake color skins
- **Wallet** – Connect via Seeker/Seed Vault (MWA) or Phantom; .skr names shown when available
- **Leaderboard** – Supabase-backed; one best score per wallet per mode/difficulty
- **PWA** – Installable from the web; works in Expo WebView for the dApp Store APK

## 🏗️ Repo layout

```
├── index.html              # Web app entry (PWA)
├── api/                     # Vercel serverless (e.g. get-skr-domain)
├── app/                     # Alternate app assets, MWA bundle, Supabase SQL
├── dapp-store-app/          # Expo app (WebView → PWA) for Android/dApp Store
├── docs/                    # Guides (deployment, MWA, .skr, dApp Store, etc.)
├── build-mwa.cjs            # Builds app/mwa-bundle.js from app/mwa-entry.js
├── package.json             # Scripts: build:mwa, fetch-skr-domains, convert-csv
└── vercel.json
```

## 🚀 Quick start (web)

1. **Install and run**
   ```bash
   npm install
   npm run build:mwa
   npx vite preview
   ```
   Or deploy to Vercel; the repo root is the app root.

2. **.skr lookup**  
   Populate `api/skr-lookup.json` (e.g. from CSV via `npm run fetch-skr-domains` then `npm run convert-csv`). The API route `api/get-skr-domain.js` serves it.

3. **Leaderboard**  
   Run the Supabase SQL in `app/supabase-01-leaderboards-table.sql` and `app/supabase-02-get-best-scores.sql` in your project; set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the app (or use the existing env).

## 📱 Android / dApp Store

- **Expo app:** `cd dapp-store-app && npm install && npx expo start`
- **Release APK:** `cd dapp-store-app && npx eas build --platform android --profile dapp-store`
- See **dapp-store-app/README.md** and **dapp-store-app/docs/** for setup, MWA, and troubleshooting.

## 📚 Documentation

Detailed guides are in **[docs/](docs/)**:

- [START_HERE.md](docs/START_HERE.md) – Where to begin
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) – Deploy web app
- [DAPP_STORE.md](docs/DAPP_STORE.md) – Submit to Solana dApp Store
- [SEEKER_MWA_GUIDE.md](docs/SEEKER_MWA_GUIDE.md) – Seeker / MWA
- [SKR_DOMAIN_IMPLEMENTATION.md](docs/SKR_DOMAIN_IMPLEMENTATION.md) – .skr resolution

App-specific: **app/MWA_WEB_INSTALLATION.md**, **app/SUPABASE_LEADERBOARD.md**

## 🔧 Scripts

| Script | Purpose |
|--------|--------|
| `npm run build:mwa` | Build MWA bundle (app/mwa-entry.js → app/mwa-bundle.js) |
| `npm run fetch-skr-domains` | Fetch .skr data (script: fetch-all-skr-domains-simple.js) |
| `npm run convert-csv` | Convert CSV to api/skr-lookup.json (convert-csv-to-lookup.js) |

## 📜 License

MIT.
