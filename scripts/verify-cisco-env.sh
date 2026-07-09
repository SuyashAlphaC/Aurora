#!/usr/bin/env bash
# Verify Aurora API health and optional Duo/Webex configuration.
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

echo "Aurora Cisco env check — ${API_URL}"
echo

if ! curl -sf "${API_URL}/api/health" -o /tmp/aurora-health.json 2>/dev/null; then
  fail "API not reachable at ${API_URL}"
  echo "  Start: cd services/api && npm run dev"
  exit 1
fi

ok "API is up"

python3 <<'PY'
import json, sys

with open("/tmp/aurora-health.json") as f:
    h = json.load(f)

print()
print("Health summary:")
print(f"  status:     {h.get('status')}")
print(f"  dataSource: {h.get('dataSource')}")
print(f"  ai:         {h.get('ai')}")
print(f"  auth:       {h.get('auth')}")

cisco = h.get("cisco") or {}
duo = cisco.get("duo")
webex = cisco.get("webex")
meraki = cisco.get("meraki")

print()
print("Cisco integrations:")
print(f"  duo:    {duo}")
print(f"  webex:  {webex}")
print(f"  meraki: {meraki}")

issues = []
if duo in (False, "not_configured", None):
    issues.append("duo")
if webex in ("not_configured", None, False):
    issues.append("webex")

if not issues:
    print()
    print("All targeted integrations (Duo + Webex) look configured.")
    sys.exit(0)

print()
print("Not yet configured:", ", ".join(issues))
print("See docs/WEBEX_DUO_QUICKSTART.md")
sys.exit(0)
PY

echo
warn "Duo login test (optional) — requires enrolled user 'coordinator':"
echo "  curl -X POST ${API_URL}/api/auth/login -H 'Content-Type: application/json' \\"
echo "    -d '{\"username\":\"coordinator\",\"passcode\":\"YOUR_CODE\",\"factor\":\"passcode\"}'"
echo
warn "Webex alert test:"
echo "  ./scripts/demo-golden-path.sh"
