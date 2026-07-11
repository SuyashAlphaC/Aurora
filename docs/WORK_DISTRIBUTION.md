# Aurora — Team Work Distribution

**Repo:** https://github.com/SuyashAlphaC/Aurora  
**Sprint:** 1–13 Jul 2026 · Silver Flag CSR

---

## Roles

| Member | Focus | Primary paths |
|--------|-------|---------------|
| **Member 1 — AI / data** | Forecasting, reroute scoring, simulator, golden-path script | `services/ai/`, `services/ai/simulator/` |
| **Member 2 — Backend / Cisco** | API, state engine, Meraki/Webex/Duo/TE, SQLite, WebSocket | `services/api/`, `scripts/` |
| **Member 3 — Frontend** | EOC dashboard, map, auth UI, Medical ID panel | `apps/dashboard/` |
| **Shared** | Docs, pitch, demo video, submission | `docs/`, `README.md` |

---

## Integration contract

All lanes merge against **`docs/API_CONTRACT.md`**:

- Member 1 exposes `POST /ai/forecast` and `POST /ai/reroute`
- Member 2 owns `/api/telemetry`, `/api/shelters`, `/api/alerts`, `/ws/live`
- Member 3 consumes REST + WebSocket with Bearer token from Duo login

---

## Parallel work timeline

| Days | Member 1 | Member 2 | Member 3 |
|------|----------|----------|----------|
| 1–3 | AI heuristics + simulator | API skeleton + SQLite seed | Dashboard shell + mocks |
| 4–6 | Forecast/reroute tests | State engine + Webex/Duo | Map + shelter cards + WS |
| 7–9 | Golden-path script | Meraki poller + webhooks | EOC UI + reroute panel |
| 10–11 | Integration testing | Medical ID API + health | Medical ID UI + polish |
| 12–13 | Demo video | Push + submission docs | Pitch deck PDF |

---

## Merge rules

1. **API contract changes** require all three to ack in PR.
2. **No secrets in git** — `.env` only local; use `.env.example`.
3. **Golden path must pass** before any demo recording: `FAST=1 ./scripts/demo-golden-path.sh`

---

## GitHub CODEOWNERS

Update `.github/CODEOWNERS` with real `@username` handles when known.
