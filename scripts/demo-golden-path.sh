#!/usr/bin/env bash
# Golden-path demo — works with Duo (passcode/push) or dev auth.
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
FAST="${FAST:-}"
SKIP_LOGIN="${SKIP_LOGIN:-}"

echo "=== Aurora Golden Path Demo ==="
echo "API: $API_URL"
echo ""

echo "[1/4] Health check..."
curl -sf "$API_URL/api/health" | python3 -m json.tool || {
  echo "API not running. Start: cd services/api && npm run dev"
  exit 1
}

TOKEN=""
if [[ "$SKIP_LOGIN" != "1" ]]; then
  echo ""
  echo "[2/4] Login (Duo passcode/push or dev)..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if TOKEN=$("$SCRIPT_DIR/auth-token.sh"); then
    echo "Token acquired."
  else
    echo "Login skipped — telemetry demo still runs. Set DUO_PASSCODE or SKIP_LOGIN=1."
  fi
else
  echo ""
  echo "[2/4] Login skipped (SKIP_LOGIN=1)"
fi

echo ""
echo "[3/4] Reset shelter-b to healthy baseline..."
curl -sf -X POST "$API_URL/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{"shelterId":"shelter-b","occupancy":120,"environment":{"airQualityIndex":65,"temperatureC":30,"humidityPct":72,"waterLeak":false},"network":{"uplinkStatus":"UP","latencyMs":45,"lossPct":0.2}}' > /dev/null

echo ""
echo "[4/4] Running surge simulator..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIM="$SCRIPT_DIR/../services/ai/simulator/run_golden_path.py"
if [[ "$FAST" == "1" || "$FAST" == "true" ]]; then
  python3 "$SIM" --api-url "$API_URL" --fast
else
  python3 "$SIM" --api-url "$API_URL"
fi

echo ""
echo "=== Demo complete ==="
echo "Dashboard: http://localhost:5173"
echo "Medical ID demo: MEDICAL ID → AUR-1001"
if [[ -n "$TOKEN" ]]; then
  echo "Alerts: curl -H \"Authorization: Bearer $TOKEN\" $API_URL/api/alerts"
fi
