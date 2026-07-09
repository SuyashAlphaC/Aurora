# Aurora

**Live Shelter & Relief-Center Command Center** — Code With Cisco 2026 Silver Flag

> *Aurora — light through the storm. One network, one clear view.*

[![Mission](https://img.shields.io/badge/Mission-Disaster%20Response-red)](docs/PROJECT.md)
[![Cisco](https://img.shields.io/badge/Cisco-Meraki%20%7C%20Webex%20%7C%20Duo-blue)](docs/CISCO_SETUP.md)

## What it does

During disasters, shelter coordinators can't see occupancy, air quality, and network health in one place. **Aurora** gives a live command center that:

- Monitors all shelters on a map (green / amber / red)
- Predicts capacity breaches with **explainable AI**
- Recommends reroutes to safer shelters
- Sends **Webex** alerts to coordinators
- Secures access with **Duo MFA**

## Quick start (local)

### Prerequisites

- Node.js 20+
- Python 3.12+
- 3 terminals

### 1. AI service (port 8001)

```bash
cd services/ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 2. API (port 8000)

```bash
cd services/api
cp .env.example .env
npm install
npm run dev
```

### 3. Dashboard (port 5173)

```bash
cd apps/dashboard
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5173** → login as `coordinator` → dashboard loads.

### 4. Run golden-path demo

```bash
chmod +x scripts/demo-golden-path.sh
FAST=1 ./scripts/demo-golden-path.sh
```

Watch Shelter B go CRITICAL → accept reroute to Shelter D.

## Docker (optional)

```bash
docker compose up --build
# Dashboard: http://localhost:8080
# API: http://localhost:8000
```

## Project structure

```
Aurora/
├── apps/dashboard/     React command center UI
├── services/api/       Node.js API + Cisco integrations
├── services/ai/        Python AI (forecast + reroute)
├── docs/               Project docs, pitch deck, submission guide
└── scripts/            Demo automation
```

## Cisco technology map

| Layer | Technology | Implementation |
|---|---|---|
| Connect | Meraki Dashboard API | `services/api/src/cisco/meraki.ts` |
| Sense | Meraki sensors + simulator | `services/ai/simulator/` |
| Observe | ThousandEyes | `services/api/src/cisco/thousandeyes.ts` |
| Engage | Webex Bot + Adaptive Cards | `services/api/src/cisco/webex.ts` |
| Secure | Duo Auth API | `services/api/src/cisco/duo.ts` |
| Intelligence | Explainable AI | `services/ai/app/` |

See [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md) to activate live credentials.

## Documentation

| Doc | Purpose |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Problem, impact, architecture |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Integration contract |
| [docs/PITCH_DECK.md](docs/PITCH_DECK.md) | 3-slide pitch + script |
| [docs/SUBMISSION.md](docs/SUBMISSION.md) | Submission checklist |
| [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md) | Credential setup guide |

## Team

Code With Cisco 2026 — Silver Flag CSR Challenge

## License

MIT
