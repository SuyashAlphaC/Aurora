# Aurora API Contract

**Version:** 1.0 · **Freeze date:** Day 0 of sprint  
**Owners:** All three members — changes require unanimous agreement.

This document is the **only integration surface** between `services/ai`, `services/api`, and `apps/dashboard`.

---

## Services & ports

| Service | Port | Base URL |
|---|---|---|
| API (Member 2) | 8000 | `http://localhost:8000` |
| AI (Member 1) | 8001 | `http://localhost:8001` |
| Dashboard (Member 3) | 5173 | `http://localhost:5173` |

---

## Shared enums

```typescript
type ShelterState = "HEALTHY" | "WARNING" | "CRITICAL";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

type AlertType =
  | "CAPACITY_WARNING"
  | "CAPACITY_CRITICAL"
  | "AIR_QUALITY"
  | "WATER_LEAK"
  | "NETWORK_DEGRADED"
  | "NETWORK_DOWN"
  | "REROUTE_RECOMMENDED";

type UplinkStatus = "UP" | "DEGRADED" | "DOWN";
```

---

## Seed data — demo shelters (frozen)

All members use this exact seed in mocks, simulator, and DB.

| id | name | lat | lng | capacity | merakiNetworkId |
|---|---|---|---|---|---|
| `shelter-a` | Riverside Primary School | 19.0760 | 72.8777 | 150 | `mock-net-a` |
| `shelter-b` | Community Hall Sector 12 | 19.0820 | 72.8850 | 200 | `mock-net-b` |
| `shelter-c` | Sports Complex North | 19.0900 | 72.8700 | 300 | `mock-net-c` |
| `shelter-d` | St. Mary's Church Hall | 19.0780 | 72.8920 | 180 | `mock-net-d` |

**Golden-path narrative:** surge targets **Shelter B** → reroute to **Shelter D**.

---

## REST — API service (`services/api`)

### `GET /api/health`
```json
{ "status": "ok", "ai": "connected" | "mock" | "down" }
```

### `GET /api/shelters`
Returns all shelters with latest telemetry snapshot.

```json
{
  "shelters": [
    {
      "id": "shelter-b",
      "name": "Community Hall Sector 12",
      "lat": 19.0820,
      "lng": 72.8850,
      "capacity": 200,
      "currentOccupancy": 182,
      "occupancyPct": 91,
      "state": "CRITICAL",
      "environment": {
        "airQualityIndex": 156,
        "temperatureC": 31.2,
        "humidityPct": 78,
        "waterLeak": false
      },
      "network": {
        "uplinkStatus": "UP",
        "latencyMs": 42,
        "lossPct": 0.1
      },
      "updatedAt": "2026-07-02T14:32:00Z"
    }
  ]
}
```

### `GET /api/shelters/:id`
Single shelter — same object shape as array item above.

### `GET /api/alerts?limit=20`
Newest first.

```json
{
  "alerts": [
    {
      "id": "alert-001",
      "shelterId": "shelter-b",
      "severity": "CRITICAL",
      "type": "CAPACITY_CRITICAL",
      "message": "Shelter B at 91% capacity. Air quality degrading.",
      "recommendation": {
        "toShelterId": "shelter-d",
        "toShelterName": "St. Mary's Church Hall",
        "reasons": [
          "Shelter D: 40% full (72/180)",
          "Air quality good (AQI 45)",
          "Uplink healthy (38ms)",
          "2.1 km from Shelter B"
        ],
        "etaMinutes": 18
      },
      "status": "OPEN" | "ACKNOWLEDGED" | "RESOLVED",
      "createdAt": "2026-07-02T14:32:00Z"
    }
  ]
}
```

### `POST /api/telemetry`
Ingestion endpoint — simulator and Meraki adapter both POST here.

**Request:**
```json
{
  "shelterId": "shelter-b",
  "timestamp": "2026-07-02T14:30:00Z",
  "occupancy": 175,
  "environment": {
    "airQualityIndex": 140,
    "temperatureC": 30.5,
    "humidityPct": 75,
    "waterLeak": false
  },
  "network": {
    "uplinkStatus": "UP",
    "latencyMs": 45,
    "lossPct": 0.2
  }
}
```

**Response:**
```json
{
  "accepted": true,
  "shelterId": "shelter-b",
  "newState": "WARNING",
  "alertEmitted": false
}
```

### `POST /api/reroute/:alertId/accept`
Coordinator accepts reroute (also triggered by Webex webhook).

**Response:**
```json
{
  "status": "RESOLVED",
  "fromShelterId": "shelter-b",
  "toShelterId": "shelter-d",
  "acceptedAt": "2026-07-02T14:33:00Z"
}
```

### Auth
- Coordinator routes require `Authorization: Bearer <duo-session-token>` (Member 2 defines exact flow).
- Dashboard sends token on all `/api/*` calls after login.

---

## REST — AI service (`services/ai`)

Member 2 proxies these; Member 3 never calls AI directly.

### `GET /ai/health`
```json
{ "status": "ok", "model": "forecast-v1" }
```

### `POST /ai/forecast`
**Request:**
```json
{
  "shelterId": "shelter-b",
  "capacity": 200,
  "history": [
    { "timestamp": "2026-07-02T14:00:00Z", "occupancy": 120 },
    { "timestamp": "2026-07-02T14:10:00Z", "occupancy": 145 },
    { "timestamp": "2026-07-02T14:20:00Z", "occupancy": 168 },
    { "timestamp": "2026-07-02T14:30:00Z", "occupancy": 182 }
  ]
}
```

**Response:**
```json
{
  "shelterId": "shelter-b",
  "minutesToCapacity": 18,
  "predictedOccupancyAt60Min": 220,
  "confidence": 0.87,
  "explanation": "Occupancy rising ~3.7/min based on last 30 min trend."
}
```

### `POST /ai/reroute`
**Request:**
```json
{
  "fromShelterId": "shelter-b",
  "candidates": [
    {
      "id": "shelter-a",
      "capacity": 150,
      "currentOccupancy": 130,
      "lat": 19.0760,
      "lng": 72.8777,
      "environment": { "airQualityIndex": 90 },
      "network": { "uplinkStatus": "UP", "latencyMs": 50 }
    },
    {
      "id": "shelter-d",
      "capacity": 180,
      "currentOccupancy": 72,
      "lat": 19.0780,
      "lng": 72.8920,
      "environment": { "airQualityIndex": 45 },
      "network": { "uplinkStatus": "UP", "latencyMs": 38 }
    }
  ],
  "fromLat": 19.0820,
  "fromLng": 72.8850
}
```

**Response:**
```json
{
  "recommendedShelterId": "shelter-d",
  "ranked": [
    {
      "shelterId": "shelter-d",
      "score": 0.92,
      "reasons": [
        "40% occupancy (72/180)",
        "Good air quality (AQI 45)",
        "Healthy uplink (38ms)",
        "Nearest viable shelter (2.1 km)"
      ]
    },
    {
      "shelterId": "shelter-a",
      "score": 0.41,
      "reasons": [
        "87% occupancy — near capacity",
        "Moderate air quality (AQI 90)"
      ]
    }
  ]
}
```

---

## WebSocket — API service

**URL:** `ws://localhost:8000/ws/live`  
**Auth:** same Bearer token as query param `?token=...` (Member 2 implements)

### Event: `shelter.updated`
```json
{
  "event": "shelter.updated",
  "data": { /* full shelter object — same as GET /api/shelters item */ }
}
```

### Event: `alert.created`
```json
{
  "event": "alert.created",
  "data": { /* full alert object — same as GET /api/alerts item */ }
}
```

### Event: `reroute.accepted`
```json
{
  "event": "reroute.accepted",
  "data": {
    "alertId": "alert-001",
    "fromShelterId": "shelter-b",
    "toShelterId": "shelter-d",
    "acceptedAt": "2026-07-02T14:33:00Z"
  }
}
```

---

## State transition rules (Member 2 implements, all respect)

| Condition | New state |
|---|---|
| occupancy ≥ 90% OR airQualityIndex ≥ 150 OR waterLeak=true OR uplink=DOWN | **CRITICAL** |
| occupancy ≥ 75% OR airQualityIndex ≥ 100 OR uplink=DEGRADED | **WARNING** |
| otherwise | **HEALTHY** |

When transitioning to **CRITICAL** for capacity/air/network:
1. Create alert
2. Call `POST /ai/reroute`
3. Emit WebSocket `alert.created`
4. Dispatch Webex message (Member 2)

---

## Golden-path simulator timeline (Member 1 implements)

Member 1's `simulator/run_golden_path.py` POSTs to `POST /api/telemetry` on this schedule:

| T+ | shelter-b occupancy | airQualityIndex | Expected state |
|---|---|---|---|
| 0 min | 120 | 65 | HEALTHY |
| 5 min | 140 | 80 | HEALTHY |
| 10 min | 160 | 110 | WARNING |
| 15 min | 175 | 130 | WARNING |
| 18 min | 185 | 150 | CRITICAL → alert + reroute |
| 20 min | 190 | 155 | CRITICAL (reroute accepted) |

Optional: at T+12 min, POST `shelter-a` network `DEGRADED` to show network alert.

---

## Environment variables

### `services/api/.env`
```
PORT=8000
DATABASE_URL=postgresql://aurora:aurora@localhost:5432/aurora
AI_SERVICE_URL=http://localhost:8001
AI_SERVICE_MOCK=false

WEBEX_BOT_TOKEN=
WEBEX_WEBHOOK_SECRET=
WEBEX_SPACE_ID=

MERAKI_API_KEY=
MERAKI_ORG_ID=

DUO_CLIENT_ID=
DUO_CLIENT_SECRET=
DUO_API_HOST=

THOUSANDEYES_TOKEN=
```

### `services/ai/.env`
```
PORT=8001
API_URL=http://localhost:8000
```

### `apps/dashboard/.env`
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/live
VITE_USE_MOCK=false
```

---

## Mock files (each member ships)

| Path | Owner |
|---|---|
| `services/ai/fixtures/sample_telemetry.json` | Member 1 |
| `services/api/src/mocks/ai-responses.json` | Member 2 |
| `apps/dashboard/src/mocks/shelters.json` | Member 3 |
| `apps/dashboard/src/mocks/alerts.json` | Member 3 |
