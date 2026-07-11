#!/usr/bin/env bash
# API smoke test — requires running API on :8000
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Aurora API smoke test ==="

curl -sf "$API_URL/api/health" | python3 -m json.tool > /dev/null
echo "✓ GET /api/health"

TOKEN=$("$SCRIPT_DIR/auth-token.sh" 2>/dev/null) || TOKEN=""
if [[ -z "$TOKEN" ]]; then
  echo "! Skipping authed routes (login failed — set DUO_PASSCODE or use dev auth)"
  exit 0
fi

curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/shelters" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d['shelters'])>=4"
echo "✓ GET /api/shelters"

curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/medical/evacuees/AUR-1001" | python3 -c "import sys,json; p=json.load(sys.stdin)['profile']; assert p['evacueeId']=='AUR-1001'"
echo "✓ GET /api/medical/evacuees/AUR-1001"

curl -sf -H "Authorization: Bearer $TOKEN" "$API_URL/api/alerts" > /dev/null
echo "✓ GET /api/alerts"

echo "=== Smoke test passed ==="
