#!/usr/bin/env bash
# Acquire Aurora coordinator session token for scripts/curl demos.
# Usage:
#   ./scripts/auth-token.sh              # dev session if Duo not configured
#   DUO_PASSCODE=123456 ./scripts/auth-token.sh
#   DUO_PUSH=1 ./scripts/auth-token.sh   # blocks until push approved
#   DEMO_USER=judge ./scripts/auth-token.sh
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
DEMO_USER="${DEMO_USER:-coordinator}"

health=$(curl -sf "${API_URL}/api/health" 2>/dev/null) || {
  echo "error: API not reachable at ${API_URL}" >&2
  exit 1
}

auth_mode=$(echo "$health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('auth','unknown'))")

login_dev() {
  curl -sf -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_USER}\",\"factor\":\"dev\"}"
}

login_passcode() {
  curl -sf -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_USER}\",\"passcode\":\"${DUO_PASSCODE}\",\"factor\":\"passcode\"}"
}

login_push() {
  curl -sf -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${DEMO_USER}\",\"factor\":\"push\"}"
}

response=""

if [[ "${AUTH_DISABLED:-}" == "true" ]] || [[ "$auth_mode" == "disabled" ]] || [[ "$auth_mode" == "session" ]]; then
  response=$(login_dev)
elif [[ -n "${DUO_PASSCODE:-}" ]]; then
  response=$(login_passcode)
elif [[ "${DUO_PUSH:-}" == "1" || "${DUO_PUSH:-}" == "true" ]]; then
  echo "Sending Duo push to ${DEMO_USER} — approve on your device…" >&2
  response=$(login_push)
else
  echo "error: Duo is enabled (auth=${auth_mode}). Set DUO_PASSCODE or DUO_PUSH=1, or AUTH_DISABLED=true for dev." >&2
  echo "  DUO_PASSCODE=123456 $0" >&2
  exit 1
fi

token=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || true)

if [[ -z "$token" ]]; then
  echo "error: login failed: $response" >&2
  exit 1
fi

# Print token to stdout for $(./scripts/auth-token.sh)
echo "$token"
