# Cisco Credentials Setup

Activate real Cisco integrations for the demo. All clients are implemented in `services/api/src/cisco/`.

Copy `services/api/.env.example` → `.env` and fill in values below.

---

## 1. Meraki Dashboard API (Connect + Sense)

**Docs:** https://developer.cisco.com/meraki/api-v1/getting-started/

1. Create account at [Meraki Dashboard](https://dashboard.meraki.com/) or use **Cisco DevNet sandbox**
2. Go to **My profile → API access** → Generate API key
3. Find Organization ID: `GET https://api.meraki.com/api/v1/organizations` with header `X-Cisco-Meraki-API-Key`

```env
MERAKI_API_KEY=your_key
MERAKI_ORG_ID=your_org_id
```

4. Map demo shelters to real network IDs (optional):

```bash
# Update meraki_network_id in DB for shelter-b to match a sandbox network
```

**Verify:** `curl http://localhost:8000/api/health` → `cisco.meraki: true`

---

## 2. Webex Bot (Engage)

**Docs:** https://developer.webex.com/messaging/docs/bots

1. Go to [Webex for Developers](https://developer.webex.com/) → **Create a Bot**
2. Copy **Bot Access Token**
3. Add bot to a **space** → copy **Room ID** from space settings

```env
WEBEX_BOT_TOKEN=your_bot_token
WEBEX_SPACE_ID=your_room_id
WEBEX_WEBHOOK_SECRET=choose_a_random_secret
```

4. For Adaptive Card "Accept" button — expose webhook:

```bash
ngrok http 8000
# Register webhook at developer.webex.com:
# Resource: attachmentActions, Event: created
# Target URL: https://YOUR-NGROK/api/webhooks/webex
# Secret: same as WEBEX_WEBHOOK_SECRET
```

**Verify:** Trigger CRITICAL telemetry → message appears in Webex space.

---

## 3. Duo Auth API (Secure)

**Docs:** https://duo.com/docs/authapi

1. Sign up at [Duo](https://signup.duo.com/) (free tier)
2. Create **Web SDK** or **Auth API** application
3. Copy Integration key, Secret key, API hostname

```env
DUO_CLIENT_ID=integration_key
DUO_CLIENT_SECRET=secret_key
DUO_API_HOST=api-xxxxx.duosecurity.com
AUTH_DISABLED=false
```

4. Enroll a test user in Duo admin panel

**Verify:** Dashboard login → enter Duo passcode → `mode: duo` in login response.

---

## 4. ThousandEyes (Observe) — Optional

**Docs:** https://developer.cisco.com/docs/thousandeyes/

1. Request trial / sandbox access
2. Generate API token

```env
THOUSANDEYES_TOKEN=your_token
```

**Verify:** `curl http://localhost:8000/api/health` → `cisco.thousandEyes: true`

---

## 5. AI Service

```env
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_MOCK=false
```

Start AI: `cd services/ai && uvicorn main:app --port 8001`

**Verify:** health shows `"ai": "connected"`

---

## Without credentials (PoC still works)

| Component | Fallback |
|---|---|
| Meraki | Simulator telemetry via `POST /api/telemetry` |
| Webex | Alerts logged to console only |
| Duo | Username-only session login |
| ThousandEyes | Skipped |
| AI | Mock responses if service down |

The pipeline is fully demo-able without credentials; credentials prove the Cisco stack for judges.
