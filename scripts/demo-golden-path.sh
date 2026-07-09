#!/usr/bin/env bash
# Aurora golden-path demo — run with API + AI + dashboard already up
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
FAST="${FAST:-}"

echo "=== Aurora Golden Path Demo ==="
echo "API: $API_URL"
echo ""

echo "[1/4] Health check..."
curl -sf "$API_URL/api/health" | python3 -m json.tool || { echo "API not running. Start: cd services/api && npm run dev"; exit 1; }

echo ""
echo "[2/4] Login..."
TOKEN=$(curl -sf -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"coordinator","factor":"dev"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token acquired."

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
echo "Open dashboard: http://localhost:5173"
echo "View alerts: curl -H \"Authorization: Bearer $TOKEN\" $API_URL/api/alerts"
