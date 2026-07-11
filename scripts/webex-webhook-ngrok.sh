#!/usr/bin/env bash
# Print ngrok + Webex webhook registration steps for Adaptive Card Accept.
set -euo pipefail

API_PORT="${API_PORT:-8000}"

echo "=== Webex webhook setup (Accept reroute from card) ==="
echo ""
echo "1. Start ngrok in another terminal:"
echo "     ngrok http ${API_PORT}"
echo ""
echo "2. Copy the https URL (e.g. https://abc123.ngrok-free.app)"
echo ""
echo "3. Register at https://developer.webex.com/docs/api/guides/webhooks"
echo "     Resource:  attachmentActions"
echo "     Event:     created"
echo "     Target:    https://<your-ngrok>/api/webhooks/webex"
echo "     Secret:    same as WEBEX_WEBHOOK_SECRET in services/api/.env"
echo ""
echo "4. Trigger CRITICAL (golden path) → tap Accept on Adaptive Card in Webex"
echo ""
echo "Dashboard Accept reroute works without webhook."
