# Webex + Duo Quickstart

Fast path to live **Engage** and **Secure** layers for Aurora demos.

---

## Duo (5 minutes)

1. [Duo Admin](https://admin.duosecurity.com) → **Applications** → **Protect an application** → **Web SDK** or **Auth API**.
2. Copy Integration key, Secret key, API hostname into `services/api/.env`:

```env
DUO_CLIENT_ID=...
DUO_CLIENT_SECRET=...
DUO_API_HOST=api-xxxxx.duosecurity.com
AUTH_DISABLED=false
```

3. **Users** → add `coordinator` → activate **Duo Mobile**.
4. Auth API app → **Enable for all users** (or per user).
5. Restart API → dashboard login → **DUO PUSH** or passcode.

Verify: login response includes `"mode": "duo"`.

**External users:** see [CISCO_SETUP.md — External access](./CISCO_SETUP.md#external-access-judges-teammates-demo-viewers).

---

## Webex bot (10 minutes)

1. [developer.webex.com](https://developer.webex.com) → **Create a Bot** → copy token.
2. On phone/desktop Webex: create a space → add the bot as member.
3. Get **Room ID** (space settings or `scripts/webex-setup-room.mjs`).
4. Add to `.env`:

```env
WEBEX_BOT_TOKEN=...
WEBEX_SPACE_ID=...
WEBEX_WEBHOOK_SECRET=random-secret-string
```

5. Restart API → run golden path → CRITICAL alert posts to space.

### Webhook (optional — Accept from card)

```bash
ngrok http 8000
```

Register at developer.webex.com: **attachmentActions** / **created** → `https://<ngrok>/api/webhooks/webex`

Or run: `./scripts/webex-webhook-ngrok.sh`

---

## One-command verify

```bash
./scripts/verify-cisco-env.sh
```

---

## Demo login from terminal

```bash
# Passcode
DUO_PASSCODE=123456 ./scripts/auth-token.sh

# Push (approve on phone)
DUO_PUSH=1 ./scripts/auth-token.sh

# No Duo configured
./scripts/auth-token.sh   # uses dev session
```

Use token: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/shelters`
