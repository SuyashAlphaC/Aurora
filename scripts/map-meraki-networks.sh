#!/usr/bin/env bash
# Map Meraki network IDs to Aurora shelters in SQLite.
# Prereq: MERAKI_* in services/api/.env, networks created in Dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="${DB_PATH:-$ROOT/services/api/data/aurora.db}"
API_URL="${API_URL:-http://localhost:8000}"

if [[ ! -f "$DB" ]]; then
  echo "error: database not found at $DB" >&2
  exit 1
fi

# Load MERAKI_ORG_ID and API key from .env (do not echo secrets)
ENV_FILE="$ROOT/services/api/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: missing $ENV_FILE" >&2
  exit 1
fi
# shellcheck disable=SC1090
source <(grep -E '^MERAKI_(API_KEY|ORG_ID|BASE_URL)=' "$ENV_FILE" | sed 's/^/export /')

BASE="${MERAKI_BASE_URL:-https://api.meraki.in/api/v1}"

echo "Fetching networks from Meraki org $MERAKI_ORG_ID …" >&2
networks_json=$(curl -sf "$BASE/organizations/$MERAKI_ORG_ID/networks" \
  -H "Authorization: Bearer $MERAKI_API_KEY")

python3 - "$DB" "$networks_json" <<'PY'
import json, sqlite3, sys

db_path, raw = sys.argv[1], sys.argv[2]
networks = json.loads(raw)

# Aurora shelter name → id (match Meraki network names loosely)
targets = {
    "riverside primary school": "shelter-a",
    "community hall sector 12": "shelter-b",
    "sports complex north": "shelter-c",
    "st marys church hall": "shelter-d",
    "st. mary's church hall": "shelter-d",
}

conn = sqlite3.connect(db_path)
cur = conn.cursor()
mapped = 0

for net in networks:
    key = net["name"].strip().lower()
    shelter_id = targets.get(key)
    if not shelter_id:
        print(f"skip: no shelter match for Meraki network '{net['name']}'")
        continue
    cur.execute(
        "UPDATE shelters SET meraki_network_id = ? WHERE id = ?",
        (net["id"], shelter_id),
    )
    print(f"mapped: {shelter_id} ← {net['name']} ({net['id']})")
    mapped += 1

conn.commit()
conn.close()
print(f"\nDone — {mapped} shelter(s) updated in {db_path}")
PY

echo "Shelters:" >&2
sqlite3 "$DB" "SELECT id, name, meraki_network_id FROM shelters ORDER BY id;"
