# Aurora Dashboard

**Owner: Member 3** — Coordinator command center UI.

## Features

- **Login** — session token via `/api/auth/login` (Duo passcode/push when configured)
- **Live map** — Leaflet pins colored by shelter state
- **Shelter cards** — occupancy, AQI, network metrics
- **Alert feed** — prioritized CRITICAL alerts
- **Reroute panel** — AI recommendation + Accept → `/api/reroute/:id/accept`
- **WebSocket** — real-time `shelter.updated`, `alert.created`, `reroute.accepted`

## Quick start

```bash
# Terminal 1 — API (Member 2)
cd ../api && npm run dev

# Terminal 2 — Dashboard
cd apps/dashboard
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 → sign in as `coordinator` → dashboard loads from API.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | REST API |
| `VITE_WS_URL` | `ws://localhost:8000/ws/live` | Live updates |
| `VITE_USE_MOCK=true` | off | Offline UI dev without backend |

## Demo golden path

1. Sign in to dashboard
2. Run simulator: `python services/ai/simulator/run_golden_path.py --api-url http://localhost:8000 --fast`
3. Watch Shelter B turn red, alert appears, accept reroute → map highlights Shelter D
