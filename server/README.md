# Snake PvP server (online)

This folder contains the Socket.io game server for **Online PvP**. By default the app uses it **online** when not on localhost.

**Performance:** 512 MB RAM is enough for ~30–50 players. Lag is usually from network latency or client re-renders, not server memory. The server sends one state update every ~180 ms; the client batches React updates to reduce jank. For 50+ concurrent players, consider 1 GB RAM and the same deploy steps.

**Global multiplayer:** The server runs in the cloud (e.g. on Render). Everyone who opens your game (from any country or network) connects to the same server URL, so laptop + phone (or any two players worldwide) share one game — it’s global, not local-only.

**Only one player visible?** All clients must hit the **same** server process. On Render: open your Web Service → **Settings** → set **Instances** to **1**. With one instance, there is a single global endpoint; every device that opens your app connects there and sees each other. If you set Instances &gt; 1, each instance has its own in-memory state and players on different instances won’t see each other. The in-game "Players" count shows how many snakes your client received from the server.

## Run locally

From the **project root**:

```bash
npm run pvp-server
```

Runs at `http://localhost:4000`. The game uses this automatically when you open the app at `http://localhost`.

## Deploy online (free)

Deploy this server so anyone can play PvP from your live site.

### Render (recommended, free tier)

1. Go to [render.com](https://render.com) and sign in (or create an account).
2. **New → Web Service**.
3. Connect your Git repo (the one containing this `server/` and root `package.json`).
4. Settings:
   - **Name:** e.g. `snake-pvp-server` (your URL will be `https://snake-pvp-server.onrender.com`).
   - **Root Directory:** leave empty (use repo root).
   - **Build Command:** `npm install`
   - **Start Command:** `npm run pvp-server`
   - **Instance Type:** Free.
5. Deploy. Wait for the service to be live.
6. Copy the service URL (e.g. `https://snake-pvp-server.onrender.com`).
7. In your frontend, set the PvP server URL:
   - In `index.html`, set `PVP_SERVER_URL` to that URL (it’s near the Supabase config), **or**
   - Before loading the app, set `window.__SNAKE_PVP_SERVER__ = 'https://your-service.onrender.com'`.

### Railway

1. Go to [railway.app](https://railway.app) and create a project.
2. Deploy from GitHub (same repo).
3. Set **Start Command:** `npm run pvp-server` (and ensure **Root** is the repo root so `npm install` runs).
4. Add a public domain in Railway (Settings → Generate Domain).
5. Use that URL as `PVP_SERVER_URL` in the app.

### Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/).
2. In the **project root**: `fly launch` (follow prompts; don’t deploy a DB).
3. Set the start command in `fly.toml` so the process runs `npm run pvp-server` (e.g. `cmd = ["npm", "run", "pvp-server"]`).
4. `fly deploy`. Use the generated URL as `PVP_SERVER_URL`.

## After deploying

- **Local:** On `localhost`, the game still uses `http://localhost:4000` so you can test without changing anything.
- **Production:** When the site is opened from a non-localhost URL, it uses `PVP_SERVER_URL`. Replace that constant in `index.html` with your deployed server URL (e.g. your Render or Railway URL) so Online PvP works for everyone.
