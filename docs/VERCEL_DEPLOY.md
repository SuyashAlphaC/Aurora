# Deploying Aurora

Aurora is three services. **Vercel is ideal for the React dashboard only.** The API and AI service need a host that supports long-running processes, WebSockets, SQLite persistence, and background jobs (Meraki poller).

| Service | Path | Vercel? | Recommended host |
|---------|------|---------|------------------|
| Dashboard | `apps/dashboard` | ✅ Yes | Vercel |
| API | `services/api` | ❌ No* | Railway, Render, Fly.io, VPS, Docker |
| AI | `services/ai` | ⚠️ Possible but awkward | Same as API (Docker Compose) |

\* The API uses **Express + WebSocket (`/ws/live`)**, **better-sqlite3**, and a **Meraki poller** — none of which fit Vercel serverless well.

---

## Recommended architecture

```
┌─────────────────────┐     HTTPS REST      ┌──────────────────────────┐
│  Vercel             │ ──────────────────► │  Railway / Render / VPS  │
│  aurora.vercel.app  │     WSS /ws/live    │  api.yourdomain.com      │
│  (React dashboard)  │ ──────────────────► │  + Python AI :8001       │
└─────────────────────┘                     └──────────────────────────┘
```

---

## Part 1 — Dashboard on Vercel

### 1. Push repo to GitHub

Ensure `https://github.com/SuyashAlphaC/Aurora` is up to date.

### 2. Import project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → Import **Aurora** repo.
2. **Root Directory:** `apps/dashboard` (important — not repo root).
3. **Framework Preset:** Vite (auto-detected).
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`

`apps/dashboard/vercel.json` is already included for SPA routing and face-model caching.

### 3. Environment variables (Vercel → Settings → Environment Variables)

Set these **before** the first production deploy (Vite bakes them in at build time):

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `https://aurora-api.up.railway.app` | Your deployed API URL, no trailing slash |
| `VITE_WS_URL` | `wss://aurora-api.up.railway.app/ws/live` | Must be **wss://** when dashboard is on HTTPS |

Redeploy after changing these variables.

### 4. Deploy

Click **Deploy**. Your dashboard will be at `https://<project>.vercel.app`.

### 5. Verify

- Open the Vercel URL → login page loads.
- If API is not deployed yet, login will fail — deploy Part 2 first.

---

## Part 2 — API + AI (backend)

Use **Docker Compose** on any container host. Example: **Railway** (one project, two services) or **Render** (two web services + disk for SQLite).

### Option A — Railway (simplest)

1. Create a Railway project from the same GitHub repo.
2. Add service: **Dockerfile** at `services/api/Dockerfile` (or deploy `docker-compose.yml` via Railway template).
3. Add service: **Dockerfile** at `services/ai/Dockerfile`.
4. Set API env vars from `services/api/.env.example` (Duo, Webex, Meraki, etc.).
5. Set `AI_SERVICE_URL` to the internal Railway URL for the AI service (e.g. `http://ai.railway.internal:8001` or public URL).
6. Attach a **volume** for `DB_PATH` / `/app/data` so SQLite survives restarts.
7. Copy the public API URL → paste into Vercel `VITE_API_URL` and `VITE_WS_URL`.

### Option B — Single VPS / Docker

```bash
cd Aurora
# Edit services/api/.env with production secrets
docker compose up --build -d
```

Expose ports 8000 (API) and optionally put **Caddy/nginx** in front for HTTPS.

### API environment (production)

```bash
PORT=8000
AUTH_DISABLED=false
AI_SERVICE_URL=http://ai:8001          # or public AI URL
AI_SERVICE_MOCK=false
DB_PATH=/app/data/aurora.db

DUO_CLIENT_ID=...
DUO_CLIENT_SECRET=...
DUO_API_HOST=...

WEBEX_BOT_TOKEN=...
WEBEX_SPACE_ID=...

MERAKI_API_KEY=...
MERAKI_ORG_ID=...
MERAKI_BASE_URL=https://api.meraki.in/api/v1   # if India org
```

### Webex webhook (optional)

If coordinators accept reroutes from Webex cards, register webhook URL:

```
https://<your-api-host>/api/webhooks/webex
```

---

## Part 3 — Connect frontend ↔ backend

After both sides are live:

1. Vercel env:
   - `VITE_API_URL=https://<api-host>`
   - `VITE_WS_URL=wss://<api-host>/ws/live`
2. **Redeploy** the Vercel project (required — Vite env is compile-time).
3. Test:
   ```bash
   curl -s https://<api-host>/api/health | python3 -m json.tool
   ```
4. Login at `https://<project>.vercel.app` with Duo.

---

## Part 4 — Static demo on Vercel (optional)

Copy `docs/demo/animated-demo.html` into `apps/dashboard/public/demo/` before build if you want the animated demo hosted on the same Vercel project.

| Asset | Path |
|-------|------|
| Animated demo | `docs/demo/animated-demo.html` |

---

## CLI deploy (dashboard only)

```bash
cd apps/dashboard
npm i -g vercel
vercel login
vercel link
vercel env add VITE_API_URL production
vercel env add VITE_WS_URL production
vercel --prod
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works locally, fails on Vercel | `VITE_API_URL` wrong or API not HTTPS-accessible |
| Dashboard loads but map never updates | WebSocket blocked — use `wss://` not `ws://`; API must support WS |
| CORS errors | API already uses `cors()` — ensure API URL matches exactly |
| Face scan models 404 | Run `npm install` in dashboard so `postinstall` copies models to `public/models/` |
| Duo push works, WS disconnects | Token in WS URL — check `getWsUrl()` and API `verifySessionToken` |
| SQLite empty after redeploy | API needs persistent volume on Railway/Render |

---

## Why not everything on Vercel?

| Aurora feature | Vercel limitation |
|----------------|-----------------|
| Live WebSocket feed | No persistent Node HTTP server |
| Meraki background poller | No long-running cron in same process |
| SQLite file DB | Ephemeral filesystem on serverless |
| better-sqlite3 | Native module; awkward in serverless bundles |

For a **submission demo**, local + Docker is enough. For a **public demo URL**, use **Vercel (UI) + Railway/Render (API+AI)**.

---

## Quick reference

```bash
# Local (full stack)
./scripts/demo-golden-path.sh   # after 3 terminals / docker compose

# Vercel dashboard only
cd apps/dashboard && vercel --prod

# Health check (production API)
curl https://<api>/api/health
```
