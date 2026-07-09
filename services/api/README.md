# Aurora API

**Owner: Member 2** — Core backend hub + Cisco integrations.

## Features

- REST API per `docs/API_CONTRACT.md`
- SQLite persistence (zero Docker required for local dev)
- State engine: `HEALTHY → WARNING → CRITICAL`
- WebSocket live events at `ws://localhost:8000/ws/live`
- AI client with mock fallback (`AI_SERVICE_MOCK=true`)
- **Meraki** uplink polling ([Dashboard API v1](https://developer.cisco.com/meraki/api-v1/getting-started/))
- **Webex** bot alerts + Adaptive Cards ([Bots guide](https://developer.webex.com/messaging/docs/bots))
- **Duo** Auth API MFA ([Auth API](https://duo.com/docs/authapi))
- **ThousandEyes** test probe ([API v7](https://developer.cisco.com/docs/thousandeyes/))

## Quick start

```bash
cd services/api
cp .env.example .env
npm install
npm run dev
```

Server: http://localhost:8000

## Environment

| Variable | Purpose |
|---|---|
| `AUTH_DISABLED=false` | **Default** — `/api/shelters`, `/api/alerts`, etc. require `Authorization: Bearer <token>` |
| `AUTH_DISABLED=true` | Emergency debug only — bypasses all auth (do not use for demo) |
| `AI_SERVICE_MOCK=true` | Use mock AI responses when Member 1 service is down |
| `MERAKI_API_KEY` + `MERAKI_ORG_ID` | Enable real Meraki uplink polling |
| `WEBEX_BOT_TOKEN` + `WEBEX_SPACE_ID` | Send real Webex alerts |
| `DUO_*` | Real MFA (disable `AUTH_DISABLED`) |

## API smoke test

```bash
# Health
curl http://localhost:8000/api/health

# Login — use Duo passcode when DUO_* is set; otherwise dev token until Duo is configured
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"coordinator","passcode":"123456"}'

# Save token from response, then:
export TOKEN="..."

curl http://localhost:8000/api/shelters -H "Authorization: Bearer $TOKEN"

# Ingest telemetry (no auth — for simulator)
curl -X POST http://localhost:8000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"shelterId":"shelter-b","occupancy":185,"environment":{"airQualityIndex":150}}'

curl http://localhost:8000/api/alerts -H "Authorization: Bearer $TOKEN"
```

## Webex webhook (Adaptive Card Accept)

1. Expose API: `ngrok http 8000`
2. Register webhook at [Webex developer portal](https://developer.webex.com/) for `attachmentActions` / `created`
3. Target URL: `https://<ngrok>/api/webhooks/webex`
4. Set `WEBEX_WEBHOOK_SECRET` to match

## Project layout

```
src/
├── cisco/       meraki, webex, duo, thousandeyes
├── clients/     ai HTTP client
├── db/          SQLite + repositories
├── engine/      state rules
├── jobs/        Meraki poller
├── middleware/  auth
├── routes/      REST routers
├── services/    telemetry + alerts
└── ws/          WebSocket hub
```
