#!/usr/bin/env bash
# Sync Aurora to EC2 and start docker-compose.ec2.yml (API + AI + Caddy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/infra/ec2/instance.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Run ./scripts/provision-ec2-backend.sh first"
  exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

KEY="${SSH_KEY:-$HOME/synapse-enclave-key.pem}"
USER="${SSH_USER:-ec2-user}"
HOST="$PUBLIC_IP"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY"
  exit 1
fi

if [[ ! -f "$ROOT/services/api/.env" ]]; then
  echo "Missing services/api/.env (copy from local Duo/Webex/Meraki config)"
  exit 1
fi

chmod 600 "$KEY"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 ${USER}@${HOST}"
RSYNC="rsync -az --delete -e \"ssh -i $KEY -o StrictHostKeyChecking=accept-new\""

echo "==> Waiting for SSH on $HOST ..."
for i in $(seq 1 40); do
  if $SSH "test -f /var/log/aurora-bootstrap-done" 2>/dev/null; then
    break
  fi
  if $SSH "echo ok" 2>/dev/null; then
    sleep 5
    break
  fi
  sleep 10
done

$SSH "echo ok" || { echo "SSH failed"; exit 1; }

echo "==> Syncing project to /opt/aurora"
eval "$RSYNC \
  --exclude node_modules --exclude .git --exclude dist --exclude .venv --exclude __pycache__ \
  --exclude services/api/data --exclude '*.db' \
  $ROOT/ ${USER}@${HOST}:/opt/aurora/"

echo "==> Copying services/api/.env"
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$ROOT/services/api/.env" "${USER}@${HOST}:/opt/aurora/services/api/.env"

echo "==> Starting containers (first run builds images — may take several minutes)"
$SSH "cd /opt/aurora && echo 'AURORA_PUBLIC_HOST=$AURORA_PUBLIC_HOST' > infra/ec2/caddy.env && \
  docker compose -f docker-compose.ec2.yml --env-file infra/ec2/caddy.env up -d --build"

echo "==> Waiting for API health"
for i in $(seq 1 30); do
  if curl -sfk "$AURORA_API_URL/api/health" >/dev/null 2>&1; then
    curl -sk "$AURORA_API_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -sk "$AURORA_API_URL/api/health"
    break
  fi
  sleep 10
done

echo ""
echo "Backend: $AURORA_API_URL"
echo "Vercel env:"
echo "  VITE_API_URL=$AURORA_API_URL"
echo "  VITE_WS_URL=$AURORA_WS_URL"
echo ""
echo "Run: ./scripts/configure-vercel-backend.sh"
