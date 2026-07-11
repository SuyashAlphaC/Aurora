# Aurora — Silver Flag Submission Guide

**Challenge:** Code With Cisco 2026 · Silver Flag CSR · **Resilient Disaster Response**  
**Deadline:** 13 Jul 2026  
**Repository:** https://github.com/SuyashAlphaC/Aurora

---

## Deliverables checklist

| # | Required by brief | Status | Location |
|---|-------------------|--------|----------|
| 1 | 3-slide pitch deck | ✅ Content ready | `docs/PITCH_DECK.md`, printable `docs/pitch/index.html` (Ctrl+P → PDF) |
| 2 | 5-minute team pitch (recorded) | ⬜ Team records | Script outline in `docs/PITCH_DECK.md` |
| 3 | Short recorded PoC demo | ⬜ Team records | Follow **Judge demo script** below |
| 4 | GitHub repository | ✅ | This repo |

---

## 5-minute local setup (judges / reviewers)

```bash
# Terminal 1 — AI
cd services/ai && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --port 8001

# Terminal 2 — API
cd services/api && cp .env.example .env   # add Cisco keys per CISCO_SETUP.md
npm install && npm run dev

# Terminal 3 — Dashboard
cd apps/dashboard && npm install && npm run dev
```

Open **http://localhost:5173** → login as `coordinator` (Duo push or passcode).

---

## Judge demo script (~3 min live)

1. **Login** — Duo MFA on bunker gate screen → **AURORA COMMAND** dashboard loads.
2. **Baseline** — 4 shelters on tactical map; telemetry strip shows counts.
3. **Golden path** — in a fourth terminal:
   ```bash
   cd Aurora
   DUO_PASSCODE=123456 FAST=1 ./scripts/demo-golden-path.sh   # or Duo push: DUO_PUSH=1
   ```
4. **CRITICAL** — Shelter B turns red; incident feed + crisis banner escalate.
5. **Webex** — open coordinator space; Aurora Critical Alert Adaptive Card appears.
6. **Reroute** — click **AUTHORIZE REROUTE** on dashboard (or Accept on Webex if webhook configured).
7. **Medical ID** — click **MEDICAL ID** → **AUR-1001** → show allergies / blood group for hospital handoff.
8. **Prove Cisco** — `curl -s http://localhost:8000/api/health | python3 -m json.tool`

---

## Cisco integration honesty matrix

Use this language in pitch Q&A — judges reward honesty over decorative claims.

| Layer | Cisco product | PoC status | How we prove it |
|-------|---------------|------------|-----------------|
| **Connect** | Meraki Dashboard API | 🟡 API live; shelter mapping uses demo IDs until org networks exist | `/api/health` → `cisco.meraki: true`; `meraki.ts` + poller |
| **Sense** | Meraki MT/MV, Cisco Spaces | 🟡 Simulator feeds telemetry; production path documented | `POST /api/telemetry`, golden-path script |
| **Observe** | ThousandEyes + Splunk | 🟡 TE health probe; rules engine = Splunk-style correlation | `thousandeyes.ts`, `state.ts` |
| **Engage** | Webex Bot + Adaptive Cards | ✅ Live when `WEBEX_*` set | CRITICAL → `sendCriticalAlert()` |
| **Secure** | Duo Auth API | ✅ Live when `DUO_*` set | Login `mode: duo`; Bearer on API + WS |
| **Intelligence** | Explainable AI | ✅ Live Python service | `/ai/forecast`, `/ai/reroute`, pytest |

**Roadmap (not claimed as live):** Cisco Spaces occupancy API, Splunk SIEM export, Umbrella DNS policy, Secure Access ZTNA.

---

## Environment variables

See `services/api/.env.example` and `docs/CISCO_SETUP.md`.

| Variable | Required for demo? | Purpose |
|----------|-------------------|---------|
| `DUO_*` | Recommended | Real MFA |
| `WEBEX_BOT_TOKEN`, `WEBEX_SPACE_ID` | Recommended | Live alerts |
| `MERAKI_API_KEY`, `MERAKI_ORG_ID` | Optional | Uplink polling (use `MERAKI_BASE_URL` for India) |
| `THOUSANDEYES_TOKEN` | Optional | Observe health badge |
| `AUTH_DISABLED` | **Keep `false`** for submission | Enforces coordinator auth |

Quick verify: `./scripts/verify-cisco-env.sh`

---

## Webex Accept-from-card (optional wow factor)

Dashboard reroute accept works without this. For in-Webex Accept:

```bash
# Terminal — expose API
ngrok http 8000

# Register webhook at developer.webex.com
# Resource: attachmentActions, Event: created
# URL: https://<ngrok-id>.ngrok.io/api/webhooks/webex
# Secret: same as WEBEX_WEBHOOK_SECRET in .env
```

Helper: `./scripts/webex-webhook-ngrok.sh`

---

## Docker (optional)

```bash
docker compose up --build
# Dashboard: http://localhost:8080
# API: http://localhost:8000
```

Uses `services/api/.env.docker` (auth disabled for container smoke). Override with your `.env` for Cisco keys.

---

## Tests

```bash
# AI service
cd services/ai && pytest tests/ -v

# API unit tests
cd services/api && npm test

# Full smoke (API must be running)
./scripts/smoke-api.sh
```

---

## Known limitations (say these aloud to judges)

1. **Meraki org may have zero networks** — demo shelters use simulated telemetry; Connect API is still exercised.
2. **Face scan** requires prior enrollment at intake; **ID lookup (AUR-1001)** works instantly for demo.
3. **Golden-path script** needs `DUO_PASSCODE` or `DUO_PUSH=1` when Duo is configured (see `scripts/auth-token.sh`).
4. **Medical data** is PoC-only — production needs consent, encryption, and regulatory compliance.

---

## Submission portal fields (fill when uploading)

| Field | Suggested value |
|-------|-----------------|
| Project name | Aurora |
| Mission | Resilient Disaster Response |
| GitHub URL | https://github.com/SuyashAlphaC/Aurora |
| One-liner | Cisco-powered live shelter command center — occupancy, environment, network health, AI reroute, Webex alerts, Duo MFA |
| Team | See README Team section |

---

## File index for reviewers

| Doc | Purpose |
|-----|---------|
| `README.md` | Quick start |
| `docs/PROJECT.md` | Problem, impact, architecture |
| `docs/PITCH_DECK.md` | 3-slide content + pitch script |
| `docs/CISCO_SETUP.md` | All Cisco credentials |
| `docs/MEDICAL_IDENTITY.md` | Evacuee medical registry module |
| `docs/API_CONTRACT.md` | Integration contract |
| `docs/WORK_DISTRIBUTION.md` | Team roles |
