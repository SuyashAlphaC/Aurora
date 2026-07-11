#!/usr/bin/env bash
# Full judge-path walkthrough (prints steps; run services separately).
set -euo pipefail

cat <<'EOF'
=== Aurora Judge Demo Path ===

Prerequisites (3 terminals):
  T1: cd services/ai && source .venv/bin/activate && uvicorn main:app --port 8001
  T2: cd services/api && npm run dev
  T3: cd apps/dashboard && npm run dev

Steps:
  1. Open http://localhost:5173 → Duo login as coordinator
  2. Run: DUO_PASSCODE=<code> FAST=1 ./scripts/demo-golden-path.sh
  3. Watch Shelter B → CRITICAL on map + incident feed
  4. Check Webex space for Adaptive Card alert
  5. Click AUTHORIZE REROUTE on dashboard
  6. Click MEDICAL ID → AUR-1001 → show allergy alert strip
  7. curl -s http://localhost:8000/api/health | python3 -m json.tool

Optional:
  ./scripts/verify-cisco-env.sh
  ./scripts/smoke-api.sh
  ./scripts/webex-webhook-ngrok.sh

EOF
