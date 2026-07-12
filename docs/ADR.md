# Architecture Decision Record — Aurora

**Project:** Aurora — Live Shelter & Relief-Center Command Center  
**Challenge:** Code With Cisco 2026 · Silver Flag CSR · Resilient Disaster Response  
**Date:** July 2026  
**Status:** PoC / hackathon submission

This ADR documents the **major architectural decisions** made during Aurora. It is intentionally concise (1–2 pages) per submission requirements.

---

## 1. Three-tier service split (React + Node API + Python AI)

**Context:** Coordinators need a real-time dashboard, Cisco API orchestration, and explainable ML scoring. A single runtime would mix concerns and slow iteration.

**Decision:** Split into three deployable services:

| Service | Port | Responsibility |
|---------|------|----------------|
| `apps/dashboard` | 5173 | Coordinator UX, WebSocket client, Duo-gated login |
| `services/api` | 8000 | Auth, telemetry ingestion, state engine, Cisco integrations, WebSocket hub |
| `services/ai` | 8001 | Capacity forecast, reroute scoring, explainable recommendations |

**Consequences:** Judges can run each layer independently; Cisco credentials stay server-side. Trade-off: three terminals for local dev (documented in README).

---

## 2. Server-side Duo Auth API (not browser Web SDK)

**Context:** The command center must be MFA-protected. Duo offers both a browser SDK and a server-side Auth API.

**Decision:** Implement **Duo Auth API** in `services/api` (`duo.ts`): push and passcode verification on `POST /api/auth/login`, then issue an HMAC-signed session token used as Bearer on REST and WebSocket.

**Consequences:** No Duo iframe in the browser; login UX is a single Aurora-branded gate. When `DUO_*` env vars are missing, push/passcode return **503** (no silent bypass). `AUTH_DISABLED=false` is required for submission demos.

**Alternatives rejected:** Client-only username login (insecure); Duo Universal Prompt in SPA (more moving parts for a 48-hour PoC).

---

## 3. Event-driven shelter state engine with live push

**Context:** Shelter status changes must reach all coordinators within seconds during a crisis.

**Decision:** Central **state engine** (`state.ts`) maps telemetry to `HEALTHY | WARNING | CRITICAL`, persists to SQLite, and broadcasts over **WebSocket** (`/ws`). Dashboard map, cards, and alert feed subscribe to one stream.

**Consequences:** Golden-path demo (sensor spike → red shelter → Webex → reroute) is deterministic and observable. Trade-off: SQLite is PoC-appropriate, not multi-region HA.

---

## 4. Cisco integration boundary: real APIs where credentials exist, simulator elsewhere

**Context:** Not every hackathon team has Meraki hardware, Spaces licenses, or Splunk tenants on day one.

**Decision:** Implement **real** Cisco clients for Duo, Webex, Meraki Dashboard API, and ThousandEyes health probes. Feed **simulated telemetry** (`demo-golden-path.sh`, sensor simulator) when field devices are absent. Document honestly in `README.md` and `docs/PROJECT.md`.

**Consequences:** Judges can verify live Cisco calls via `/api/health` and Webex cards while still seeing a compelling crisis narrative. Meraki uses regional base URL (`api.meraki.in`) with uplink endpoint fallback for India orgs.

**Alternatives rejected:** Fake “Cisco” logos with no API calls (fails technical review); requiring physical MX at every shelter (blocks demo).

---

## 5. Webex as engagement channel; dashboard as system of record for reroute

**Context:** Coordinators live in Webex during incidents, but reroute authorization needs auditability.

**Decision:** **Webex Adaptive Cards** fire on `CRITICAL` via `sendCriticalAlert()`. Primary demo path: coordinator clicks **AUTHORIZE REROUTE** on the dashboard. Optional webhook (`/api/webhooks/webex`) mirrors Accept from Webex back into the API.

**Consequences:** Demo works without ngrok; advanced teams can show in-Webex Accept. Single reroute state in SQLite avoids split-brain.

---

## 6. Explainable AI as a separate Python microservice

**Context:** Forecast and reroute scoring benefit from Python ML ecosystem; Node API should stay I/O-bound.

**Decision:** FastAPI service exposes `/ai/forecast` and `/ai/reroute` with **human-readable reasons** in the JSON response. API calls AI on anomaly escalation; results surface in alert feed and reroute panel.

**Consequences:** `pytest` covers AI logic independently. Trade-off: extra process to run locally (acceptable for demo).

---

## 7. Evacuee Medical ID as optional module, not core hot path

**Context:** Hospital handoff adds CSR impact but must not block shelter telemetry flow.

**Decision:** Medical registry (ID lookup `AUR-1001`, optional face enrollment) lives in dashboard + API routes documented in `MEDICAL_IDENTITY.md`. It does not gate shelter state transitions.

**Consequences:** Pitch can show Medical ID in minute 4–5 without risking golden-path timing. Production would require consent, encryption, and regulatory review (called out as limitation).

---

## 8. Repository layout and demo assets for submission

**Context:** FAQ requires README, ADR, architecture diagrams, and demo code (HTML/JS acceptable).

**Decision:** Monorepo at repo root; `docs/ADR.md`, `docs/architecture/DIAGRAMS.md`, and the functional React dashboard satisfy documentation requirements. Demo video and pitch deck are prepared outside the repo.

**Consequences:** Reviewers have one private GitHub repo with both runnable PoC and recordable 5-minute animated pitch.

---

## 9. Deferred Cisco Spaces and Splunk integrations

**Context:** The challenge architecture names **Cisco Spaces** (Sense) and **Splunk** (Observe). Implementing them requires tenant infrastructure we did not have: a **Cisco Spaces license/tenant** with location zones on Meraki/Catalyst, and a **Splunk Cloud** (or Enterprise) deployment with **HEC** enabled.

**Decision:** **Do not implement mock clients.** Document deferral honestly in README and PROJECT.md §6.4. Substitute Spaces with the **telemetry simulator** feeding `processTelemetry()`; substitute Splunk with the in-app **rules engine** (`engine/state.ts`). Preserve clear **wiring plans** so production teams know exactly where to plug in when tenants exist.

**Consequences:** Submission stays technically credible (real Duo/Webex/Meraki/TE where configured). Spaces and Splunk remain roadmap with concrete file-level integration points (`cisco/spaces.ts`, `observe/splunkHec.ts`, poller/webhook + HEC hooks). No false `/api/health` flags for services we cannot call.

**Alternatives rejected:** Hard-coded fake Spaces/Splunk responses (misleading to judges); blocking the PoC on enterprise procurement (would prevent demo).

---

## Decision summary

| Area | Choice |
|------|--------|
| Frontend | React + Vite, WebSocket live updates |
| API | Node/Express, SQLite, Cisco SDK wrappers |
| AI | Python FastAPI, explainable outputs |
| Auth | Duo Auth API, server-issued session token |
| Real-time | WebSocket broadcast from state engine |
| Cisco | Real Duo/Webex/Meraki/TE; simulated field telemetry when needed; Spaces/Splunk deferred (no tenant) |
| Demo | Live golden path via simulator + dashboard |
