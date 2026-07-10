# Cisco Credentials Setup

Activate real Cisco integrations for the demo. All clients are implemented in `services/api/src/cisco/`.

Copy `services/api/.env.example` → `.env` and fill in values below.

---

## 1. Meraki Dashboard API (Connect + Sense)

**Docs:** https://developer.cisco.com/meraki/api-v1/getting-started/

1. Create account at [Meraki Dashboard](https://dashboard.meraki.com/) or use **Cisco DevNet sandbox**
2. Go to **My profile → API access** → Generate API key
3. Find Organization ID:

```bash
curl -sL https://api.meraki.com/api/v1/organizations \
  -H "Authorization: Bearer YOUR_API_KEY" | python3 -m json.tool
```

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

### External access (judges, teammates, demo viewers)

Aurora uses Duo **Auth API** on the server: login sends a push (or passcode check) for whatever **Operator ID** the user types. The push goes to the **Duo user with that username** in *your* Duo account — not to a random visitor's phone.

| Scenario | What happens |
|----------|----------------|
| User logs in as `coordinator` (your enrolled user) | Push goes to **your** Duo Mobile |
| User types a username that **doesn't exist** in Duo | Login fails — user must enroll or is denied by policy |
| You **create** the user in Duo Admin and they activate Duo Mobile | Push goes to **their** phone |
| User exists but **Duo Mobile not activated** | Error: user must enroll a device |
| Auth API not enabled for that user | Push denied by Duo policy |

Aurora has no separate user database: anyone who passes Duo MFA for a username gets a session for that username. Control access by who you add in Duo Admin.

**Option A — Shared demo account (quickest)**  
Everyone uses `coordinator`. You approve the Duo push on your phone during the live demo. Fine for a guided walkthrough; not ideal for self-serve access.

**Option B — Per-person Duo users (recommended for judges)**  
In [Duo Admin](https://admin.duosecurity.com):

1. **Users → Add user** (e.g. `judge.smith` — usernames are case-sensitive)
2. Send enrollment link or QR for **Duo Mobile**
3. Under your **Auth API** application, enable the user (or use **Enable for all users**)
4. Share Aurora URL + exact username; they click **DUO PUSH AUTHENTICATION** → approve on their device

**Option C — Passcode instead of push**  
Enrolled users can enter a **6-digit passcode** from Duo Mobile (works without push). Same enrollment requirement as Option B.

**Checklist before sharing Aurora externally**

- [ ] Create each external user in Duo Admin
- [ ] Each user activates Duo Mobile (or you provide passcode workflow)
- [ ] Auth API enabled for those users
- [ ] `AUTH_DISABLED=false` in `services/api/.env`
- [ ] Share the exact **Operator ID** each person must type at login

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
