# Webex + Duo Quickstart (free, no hardware)

~25 minutes to get two real Cisco integrations running for the Silver Flag demo. No Meraki gear, no credit card for ThousandEyes.

**What you get**

| Integration | Judge-visible proof |
|---|---|
| **Duo** | Dashboard login returns `mode: "duo"`; passcode or push MFA |
| **Webex** | Critical alert Adaptive Card in a team space when shelter goes CRITICAL |

Optional: ngrok exposes the **Accept reroute** button from the Webex card back to your API.

---

## Before you start

```bash
cd /path/to/Aurora
cp services/api/.env.example services/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
```

Keep these running during verification (three terminals):

```bash
# Terminal 1 — API
cd services/api && npm install && npm run dev

# Terminal 2 — forecasting service
cd services/ai && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --port 8001

# Terminal 3 — dashboard
cd apps/dashboard && npm install && npm run dev
```

---

## Part A — Duo MFA (~15 min)

**Cost:** free Duo account · **Hardware:** none

### A1. Create a Duo account

1. Go to [https://signup.duo.com/](https://signup.duo.com/) and create an account.
2. In the Duo Admin Panel, add an application:
   - **Protect an application** → search **Auth API**
   - Click **Protect** (not Web SDK — Aurora uses the Auth API)
3. Copy three values from the application page:
   - **Integration key** → `DUO_CLIENT_ID`
   - **Secret key** → `DUO_CLIENT_SECRET`
   - **API hostname** (e.g. `api-xxxxx.duosecurity.com`) → `DUO_API_HOST`

### A2. Enroll your demo user

The dashboard defaults to username **`coordinator`**. Duo must know this user.

1. In Duo Admin → **Users** → **Add User**
2. Username: `coordinator` (must match what you type on the login screen)
3. Add a phone (your mobile) and activate Duo Mobile.

### A3. Add to `.env`

Edit `services/api/.env`:

```env
DUO_CLIENT_ID=YOUR_INTEGRATION_KEY
DUO_CLIENT_SECRET=YOUR_SECRET_KEY
DUO_API_HOST=api-xxxxxxxx.duosecurity.com
AUTH_DISABLED=false
SESSION_SECRET=use-a-long-random-string-here
```

### A4. Verify Duo

```bash
curl -s http://localhost:8000/api/health | python3 -m json.tool
# Expect: "duo": true  (or "connected" depending on version — check cisco.duo field)

# Login with passcode (get code from Duo Mobile app)
curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"coordinator","passcode":"123456","factor":"passcode"}' | python3 -m json.tool
# Expect: "mode": "duo" and a "token" field
```

**Dashboard:** open [http://localhost:5173](http://localhost:5173) → Sign in as `coordinator` → enter Duo passcode or use **Sign in with Duo Push**.

**Troubleshooting**

| Symptom | Fix |
|---|---|
| `Duo authentication failed` | Username in Duo must exactly match login username |
| `Invalid Duo passcode` | Use current 6-digit code from Duo Mobile |
| Push never arrives | Confirm phone is activated for user `coordinator` |
| Still get `mode: dev` | Restart API after editing `.env`; confirm all three `DUO_*` vars are set |

---

## Part B — Webex Bot (~10 min)

**Cost:** free Webex developer account · **Hardware:** none

### B1. Create a bot

1. Go to [https://developer.webex.com/my-apps/new](https://developer.webex.com/my-apps/new)
2. Create a **Bot**
3. Name: e.g. `Aurora Alert Bot`
4. Copy the **Bot Access Token** → `WEBEX_BOT_TOKEN`  
   (You only see this once — save it immediately.)

### B2. Create a space and add the bot

1. Open Webex (desktop or web) → **Messaging** → create a space, e.g. `Aurora Command Center`
2. **People** → add your bot by its username (shown on the developer app page)
3. Get the **Room ID**:
   - Developer portal → your bot → **API Reference** → try `GET /rooms`, or
   - From the space URL in some clients, or
   - Run:

```bash
curl -s "https://webexapis.com/v1/rooms" \
  -H "Authorization: Bearer YOUR_BOT_TOKEN" | python3 -m json.tool
# Copy "id" for your Aurora space → WEBEX_SPACE_ID
```

### B3. Add to `.env`

```env
WEBEX_BOT_TOKEN=YOUR_BOT_ACCESS_TOKEN
WEBEX_SPACE_ID=YOUR_ROOM_ID
WEBEX_WEBHOOK_SECRET=pick-any-random-string-for-webhooks
```

Restart the API after saving.

### B4. Verify Webex (message on CRITICAL)

Trigger the golden path (floods Shelter B → CRITICAL):

```bash
./scripts/demo-golden-path.sh
```

Or manually post telemetry until occupancy triggers CRITICAL on shelter-b.

**Expected:** A message appears in your Webex space with an Adaptive Card titled **Aurora Critical Alert**, occupancy facts, and **Accept reroute** / **Dismiss** buttons.

```bash
curl -s http://localhost:8000/api/health | python3 -m json.tool
# Expect: cisco.webex: "configured"
```

**Troubleshooting**

| Symptom | Fix |
|---|---|
| No message in space | Bot must be a member of the space; `WEBEX_SPACE_ID` must be that room's ID |
| `Webex API 401` | Regenerate bot token; no extra spaces in `.env` |
| Message in console only | `WEBEX_BOT_TOKEN` or `WEBEX_SPACE_ID` empty — check health endpoint |

---

## Part C — Webex Accept button (optional, +10 min)

The card's **Accept reroute** button needs a public URL so Webex can POST the webhook.

### C1. Install ngrok (free tier)

```bash
# Linux — snap or download from https://ngrok.com/
ngrok http 8000
```

Copy the HTTPS URL, e.g. `https://abc123.ngrok-free.app`

### C2. Register webhook in Webex developer portal

1. [https://developer.webex.com/docs/api/guides/webhooks](https://developer.webex.com/docs/api/guides/webhooks)
2. Create webhook:
   - **Target URL:** `https://YOUR-NGROK-URL/api/webhooks/webex`
   - **Resource:** `attachmentActions`
   - **Event:** `created`
   - **Secret:** same value as `WEBEX_WEBHOOK_SECRET` in `.env`

### C3. Test Accept from Webex

1. Trigger CRITICAL again → card appears in space
2. Click **Accept reroute**
3. API logs should show webhook hit; dashboard reroute panel updates

Without ngrok, the demo still works — judges see the Webex alert; coordinators accept reroute from the dashboard instead.

---

## Complete free `.env` (Webex + Duo only)

`services/api/.env`:

```env
PORT=8000
DB_PATH=./data/aurora.db
SESSION_SECRET=change-me-to-a-long-random-string

AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_MOCK=false
AUTH_DISABLED=false

# Duo — fill after Part A
DUO_CLIENT_ID=
DUO_CLIENT_SECRET=
DUO_API_HOST=

# Webex — fill after Part B
WEBEX_BOT_TOKEN=
WEBEX_SPACE_ID=
WEBEX_WEBHOOK_SECRET=any-random-secret

# Leave empty for now (simulator covers telemetry)
MERAKI_API_KEY=
MERAKI_ORG_ID=
THOUSANDEYES_TOKEN=
```

`apps/dashboard/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/live
VITE_USE_MOCK=false
```

---

## 5-minute judge demo script (with Webex + Duo)

1. **Login** — coordinator signs in with Duo push or passcode → System Status shows auth on.
2. **Normal ops** — map shows four shelters, HEALTHY/WARNING states.
3. **Crisis** — run `./scripts/demo-golden-path.sh` or flood shelter-b telemetry.
4. **Webex** — switch to Webex space; show Adaptive Card alert.
5. **Reroute** — dashboard shows AI recommendation; accept on dashboard (or from Webex if ngrok is up).
6. **Health** — `curl localhost:8000/api/health` shows Duo + Webex configured.

---

## Quick verify script

After filling `.env`:

```bash
./scripts/verify-cisco-env.sh
```

---

## What to skip for now

| Variable | Why |
|---|---|
| `MERAKI_*` | Use simulator + golden path instead |
| `THOUSANDEYES_TOKEN` | Trial/enterprise; not needed for core demo |

See full reference: [CISCO_SETUP.md](./CISCO_SETUP.md)
