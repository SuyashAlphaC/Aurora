# Aurora

**Live Shelter & Relief-Center Command Center** — Code With Cisco 2026 Silver Flag

> *Aurora — light through the storm. One network, one clear view.*

[![Mission](https://img.shields.io/badge/Mission-Disaster%20Response-red)](docs/PROJECT.md)
[![Cisco](https://img.shields.io/badge/Cisco-Meraki%20%7C%20Webex%20%7C%20Duo-blue)](docs/CISCO_SETUP.md)
[![Submit](https://img.shields.io/badge/Submission-guide-green)](docs/SUBMISSION.md)

**Repository:** https://github.com/SuyashAlphaC/Aurora (set **private** for final submission per FAQ)

| Submission docs | |
|-----------------|--|
| [ADR](docs/ADR.md) | Major architectural decisions (1–2 pages) |
| [Architecture diagrams](docs/architecture/DIAGRAMS.md) | Components, golden path, auth, state model |
| [Deploy on Vercel](docs/VERCEL_DEPLOY.md) | Dashboard on Vercel + API on Railway/Docker |

## What it does

During disasters, shelter coordinators can't see occupancy, air quality, and network health in one place. **Aurora** gives a live command center that:

- Monitors all shelters on a tactical map (green / amber / red)
- Predicts capacity breaches with **explainable AI**
- Recommends reroutes to safer shelters
- Sends **Webex** alerts to coordinators
- Secures access with **Duo MFA**
- **Evacuee Medical ID** — pre-registered health profiles via ID lookup or face scan ([docs](docs/MEDICAL_IDENTITY.md))

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
cp .env.example .env   # add Cisco keys — see docs/CISCO_SETUP.md
npm install
npm run dev
```

### 3. Dashboard (port 5173)

```bash
cd apps/dashboard
npm install
npm run dev
```

Open **http://localhost:5173** → login as `coordinator` (Duo) → dashboard loads.

> Face-scan models ship in `apps/dashboard/public/models/` (from `@vladmandic/face-api`). Re-copy after `npm install` if missing:  
> `cp -r node_modules/@vladmandic/face-api/model/* public/models/`

### 4. Run golden-path demo

```bash
chmod +x scripts/*.sh
DUO_PASSCODE=your_code FAST=1 ./scripts/demo-golden-path.sh
# Or: DUO_PUSH=1 FAST=1 ./scripts/demo-golden-path.sh
```

Watch Shelter B go CRITICAL → accept reroute → try **MEDICAL ID → AUR-1001**.

## Docker (optional)

```bash
docker compose up --build
# Dashboard: http://localhost:8080  ·  API: http://localhost:8000
```

Uses `services/api/.env.docker` (auth disabled for quick smoke). See `docs/SUBMISSION.md`.

## Project structure

```
Aurora/
├── apps/dashboard/     React EOC UI + Medical ID panel
├── services/api/       Node.js API + Cisco integrations
├── services/ai/        Python AI (forecast + reroute)
├── docs/               Project docs
└── scripts/            Demo automation, auth helper, smoke tests
```

## Cisco technology map

| Layer | Technology | Implementation |
|---|---|---|
| Connect | Meraki Dashboard API | `services/api/src/cisco/meraki.ts` |
| Sense | Meraki sensors + simulator | `services/ai/simulator/` |
| Observe | ThousandEyes + rules engine | `thousandeyes.ts`, `engine/state.ts` |
| Engage | Webex Bot + Adaptive Cards | `services/api/src/cisco/webex.ts` |
| Secure | Duo Auth API | `services/api/src/cisco/duo.ts` |
| Intelligence | Explainable AI | `services/ai/app/` |

See [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md) · quickstart [docs/WEBEX_DUO_QUICKSTART.md](docs/WEBEX_DUO_QUICKSTART.md)

## Documentation

| Doc | Purpose |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Problem, impact, architecture |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Integration contract |
| [docs/MEDICAL_IDENTITY.md](docs/MEDICAL_IDENTITY.md) | Evacuee medical registry |
| [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md) | Credential setup |

## Tests

```bash
cd services/ai && pytest tests/ -v
cd services/api && npm test
./scripts/smoke-api.sh    # API must be running
```

## License

MIT — see [LICENSE](LICENSE)

Code With Cisco 2026 — Silver Flag CSR Challenge
