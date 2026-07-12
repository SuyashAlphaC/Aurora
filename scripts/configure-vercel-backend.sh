#!/usr/bin/env bash
# Point Vercel dashboard at the EC2 backend and redeploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/infra/ec2/instance.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Run provision + deploy first"
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

cd "$ROOT/apps/dashboard"

if ! command -v vercel >/dev/null; then
  echo "vercel CLI not found"
  exit 1
fi

vercel link --yes 2>/dev/null || true

printf '%s' "$AURORA_API_URL" | vercel env rm VITE_API_URL production -y 2>/dev/null || true
printf '%s' "$AURORA_API_URL" | vercel env add VITE_API_URL production

printf '%s' "$AURORA_WS_URL" | vercel env rm VITE_WS_URL production -y 2>/dev/null || true
printf '%s' "$AURORA_WS_URL" | vercel env add VITE_WS_URL production

vercel --prod --yes

echo ""
echo "Dashboard redeployed with:"
echo "  VITE_API_URL=$AURORA_API_URL"
echo "  VITE_WS_URL=$AURORA_WS_URL"
