# Aurora

**Live Shelter & Relief-Center Command Center** — Code With Cisco 2026 Silver Flag

> *Aurora — light through the storm. One network, one clear view.*

[![Mission](https://img.shields.io/badge/Mission-Disaster%20Response-red)](docs/PROJECT.md)
[![Cisco](https://img.shields.io/badge/Cisco-Meraki%20%7C%20Webex%20%7C%20Duo-blue)](docs/CISCO_SETUP.md)

**Repository:** https://github.com/SuyashAlphaC/Aurora  
**Live demo:** https://aurora-csr.vercel.app

> **PoC scope:** Aurora is a **demo-complete vertical slice** — the React dashboard, Node API, and Python AI service are **fully wired** (REST + WebSocket). Cisco APIs are **integrated in code**; field telemetry for the live demo is driven by a **simulator** and `demo-golden-path.sh` unless physical Meraki sensors are attached.

## Live deployment

Aurora is deployed for judges and demos — dashboard on **Vercel**, API + AI on **AWS EC2** (Docker Compose + Caddy TLS).

| Service | URL | Host |
|---------|-----|------|
| **Dashboard** | https://aurora-csr.vercel.app | Vercel (`aurora` project) |
| **API (REST)** | https://52-86-46-38.sslip.io | EC2 `t3.small` · us-east-1 |
| **WebSocket** | `wss://52-86-46-38.sslip.io/ws/live` | Same EC2 stack |

**What works in production today**

- **Duo MFA** — login page shows *SECURE CHANNEL READY · DUO MFA REQUIRED* when the API is reachable.
- **Live map + WebSocket** — shelter cards and incident feed update without refresh after login.
- **Cisco integrations** — Meraki, Webex, and Duo are configured on the EC2 API (verify: `curl -s https://52-86-46-38.sslip.io/api/health`).
- **Medical ID** — **MEDICAL ID** in the command header → ID lookup (`AUR-1001`) or **FACE SCAN** after enrollment (see [Medical ID](#evacuee-medical-id)).
- **Field telemetry** — crisis narrative still driven by `demo-golden-path.sh` against the cloud API (simulator, not live MT/MV sensors).

Redeploy helpers: `scripts/configure-vercel-backend.sh` · `scripts/deploy-ec2-backend.sh` · [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)

| Docs | |
|------|--|
| [ADR](docs/ADR.md) | Architectural decisions |
| [Architecture diagrams](docs/architecture/DIAGRAMS.md) | Components, golden path, auth |
| [Deploy on Vercel](docs/VERCEL_DEPLOY.md) | Dashboard on Vercel + API elsewhere |

## What it does

During disasters, shelter coordinators can't see occupancy, air quality, and network health in one place. **Aurora** gives a live command center that:

- Monitors all shelters on a tactical map (green / amber / red)
- Predicts capacity breaches with **explainable AI**
- Recommends reroutes to safer shelters
- Sends **Webex** alerts to coordinators
- Secures access with **Duo MFA**
- **Evacuee Medical ID** — pre-registered health profiles via ID lookup or browser face scan ([docs](docs/MEDICAL_IDENTITY.md))

### Evacuee Medical ID

When family is not present at intake, coordinators open **MEDICAL ID** on the dashboard to retrieve blood group, allergies, conditions, and medications — **Duo-secured** on every `/api/medical/*` route.

| Mode | How it works |
|------|----------------|
| **ID lookup** | Enter or pick a pre-registered ID (demo: `AUR-1001`–`AUR-1004`) → profile card loads instantly |
| **Face scan** | Browser camera + `@vladmandic/face-api` extracts a 128-dim embedding → `POST /api/medical/identify` matches against enrolled evacuees |
| **Register** | Enroll or update a profile and capture face at intake (required before face scan works in demo) |

Pre-seeded demo evacuees include **Priya Sharma (`AUR-1001`)** — O+, penicillin/shellfish allergy, asthma. All lookups are audit-logged. Face scan supplements ID/QR wristbands; it does not replace them in the field.

**Try on live demo:** https://aurora-csr.vercel.app → Duo login → **MEDICAL ID** → **ID LOOKUP** → `AUR-1001`.

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

Uses `services/api/.env.docker` (auth disabled for quick smoke). Add Cisco keys via `.env` for full integrations — see [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md).

## Tech stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Frontend** | React 18, TypeScript, Vite, Leaflet, `@vladmandic/face-api` | `apps/dashboard` |
| **API** | Node.js 20, Express, WebSocket (`ws`), better-sqlite3 | `services/api` |
| **AI** | Python 3.12, FastAPI, pytest | `services/ai` |
| **Data** | SQLite (shelters, telemetry, alerts, medical registry) | `services/api/src/db/` |
| **Realtime** | WebSocket `/ws/live` — map, cards, feed push | API → dashboard |
| **Demo automation** | Bash + Python simulator | `scripts/`, `services/ai/simulator/` |
| **Deploy** | Docker Compose (optional) | `docker-compose.yml` |

## Integration status (current build)

What is **wired in code** vs what is **live in a typical demo** (with `services/api/.env` configured). **Cloud instance:** dashboard at https://aurora-csr.vercel.app · API at https://52-86-46-38.sslip.io (see [Live deployment](#live-deployment)).

| Component | Wired (code path) | Live in demo? | Notes |
|-----------|-------------------|---------------|-------|
| Dashboard ↔ API (REST) | ✅ | ✅ | Bearer token after Duo login |
| Dashboard ↔ API (WebSocket) | ✅ | ✅ | `/ws/live?token=…` |
| API ↔ AI service | ✅ | ✅ | `POST /ai/forecast`, `/ai/reroute` on :8001 |
| **Duo MFA** | ✅ | ✅ when `DUO_*` set | Server-side Duo Auth API (`duo.ts`) |
| **Webex alerts** | ✅ | ✅ when `WEBEX_*` set | Adaptive Cards on CRITICAL |
| **Meraki Dashboard API** | ✅ | ✅ when `MERAKI_*` set | Org + 4 shelter networks mapped; uplink data needs MX hardware |
| **Field telemetry** | ✅ | 🟡 Simulator | `POST /api/telemetry` + `demo-golden-path.sh` — not live MT/MV sensors |
| **ThousandEyes** | ✅ | 🟡 Optional | Health probe in `/api/health` |
| **Rules engine (“Observe”)** | ✅ | ✅ | Threshold logic in `engine/state.ts` — Splunk-style, not Splunk SIEM |
| **Medical ID** | ✅ | ✅ | ID lookup + face scan; Duo-secured routes — live at [aurora-csr.vercel.app](https://aurora-csr.vercel.app) |
| Cisco Spaces | 🔜 Roadmap | ❌ | No Spaces tenant/license — see [deferred integrations](#deferred-cisco-integrations-spaces--splunk) |
| Splunk export | 🔜 Roadmap | ❌ | No Splunk Cloud tenant — rules engine stand-in; wiring documented below |

Prove integrations: `curl -s http://localhost:8000/api/health | python3 -m json.tool`

### Deferred Cisco integrations (Spaces & Splunk)

These are **architecturally planned** (Sense + Observe layers in `docs/PROJECT.md`) but **not implemented in code** for this PoC. We had working Duo, Webex, Meraki, and ThousandEyes credentials; we did **not** have access to a **Cisco Spaces** tenant/license or a **Splunk Cloud** (or Enterprise + HEC) instance. Building fake clients would misrepresent the submission — so we use a **telemetry simulator** for Sense and an in-process **rules engine** (`engine/state.ts`) for Observe instead.

#### Cisco Spaces — why deferred & how to wire

| | |
|---|---|
| **Why not built** | Cisco Spaces requires an org **Spaces license/tenant**, partner-enabled **Meraki or Catalyst** integration, and location zones mapped to physical sites. Student/hackathon accounts typically do not include Spaces; our Meraki org covers Dashboard API (Connect) but not Spaces occupancy feeds. |
| **What we use instead** | `POST /api/telemetry` + Python simulator (`services/ai/simulator/`) → same ingestion path production Spaces would use. |
| **How to wire (production)** | 1. Add `services/api/src/cisco/spaces.ts` — REST client for [Cisco Spaces API](https://developer.cisco.com/docs/spaces/) (location counts, zone density, or Firehose notifications). 2. Add `spacesPoller.ts` (mirror `jobs/merakiPoller.ts`) or a webhook route `POST /api/webhooks/spaces`. 3. Map each shelter to a Spaces **locationId / zoneId** in config (same table as `merakiNetworkId`). 4. Normalize Spaces readings → `TelemetryInput` (`occupancy`, optional env fields) → call existing `processTelemetry()` in `services/telemetry.ts`. 5. Dashboard and state engine unchanged — they already consume unified telemetry. |

#### Splunk — why deferred & how to wire

| | |
|---|---|
| **Why not built** | Splunk integration needs **Splunk Cloud** or **Splunk Enterprise** with **HTTP Event Collector (HEC)** enabled (token + index). We had no Splunk tenant for this challenge timeline. |
| **What we use instead** | `engine/state.ts` + `services/telemetry.ts` — threshold correlation, `WARNING`/`CRITICAL` classification, and alert emission (Splunk-*style* logic, not Splunk SIEM). |
| **How to wire (production)** | 1. Add `services/api/src/observe/splunkHec.ts` — `POST` JSON events to `$SPLUNK_HEC_URL/services/collector/event` with `$SPLUNK_HEC_TOKEN`. 2. Emit structured events at existing hook points: telemetry ingest (`insertTelemetry`), shelter state change (`updateShelter`), alert create/ack (`createAlert`, `acceptReroute`), optional Duo login and `medical_access_log`. 3. Suggested sourcetypes: `aurora:telemetry`, `aurora:alert`, `aurora:audit`. 4. In Splunk, SPL searches correlate occupancy + AQI + uplink (replacing or augmenting `computeShelterState`). 5. Optional: Splunk → Webex modular alert for teams that centralize Engage in Splunk. Aurora’s in-app rules engine can remain as **edge pre-filter** for sub-second WebSocket push while Splunk holds the audit trail. |

Full narrative: [docs/PROJECT.md §6.4](docs/PROJECT.md#64-deferred-integrations-cisco-spaces--splunk) · [docs/ADR.md §9](docs/ADR.md#9-deferred-cisco-spaces-and-splunk-integrations)

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

| Layer | Cisco product | Code | PoC status |
|-------|---------------|------|------------|
| Connect | Meraki Dashboard API | `cisco/meraki.ts` | Live API; uplinks need devices |
| Sense | Meraki MT/MV + simulator | `ai/simulator/`, `/api/telemetry` | Simulator for demo |
| Observe | ThousandEyes + rules engine | `thousandeyes.ts`, `engine/state.ts` | TE probe; rules live |
| Engage | Webex Bot + Adaptive Cards | `cisco/webex.ts` | Live when configured |
| Secure | Duo Auth API | `cisco/duo.ts` | Live when configured |
| Intelligence | Explainable AI | `services/ai/app/` | Live Python service |

See [docs/CISCO_SETUP.md](docs/CISCO_SETUP.md) · [docs/WEBEX_DUO_QUICKSTART.md](docs/WEBEX_DUO_QUICKSTART.md) · full detail in [docs/PROJECT.md](docs/PROJECT.md)

## Documentation

| Doc | Purpose |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Problem, impact, tech stack, **live deployment**, integration status |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Integration contract |
| [docs/MEDICAL_IDENTITY.md](docs/MEDICAL_IDENTITY.md) | Evacuee medical registry |
| [docs/ADR.md](docs/ADR.md) | Architectural decisions (incl. Spaces/Splunk deferral) |
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
