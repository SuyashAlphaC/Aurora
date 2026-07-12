# Aurora — Architecture Diagrams

Concise architecture illustrations for Aurora. 

---

## Diagram 1 — System components (layered architecture)

Major components and Cisco touchpoints.

```mermaid
flowchart TB
    subgraph FIELD["Field — Shelters"]
        S1["Shelter A · Meraki network"]
        S2["Shelter B · Meraki network"]
        S3["Shelter C/D"]
        SIM["Telemetry simulator / golden-path script"]
    end

    subgraph CISCO["Cisco cloud APIs"]
        MER["Meraki Dashboard API"]
        TE["ThousandEyes"]
        WX["Webex Bot + Adaptive Cards"]
        DUO["Duo Auth API"]
    end

    subgraph API["Aurora API · Node :8000"]
        ING["Ingestion /api/telemetry"]
        ST["State engine HEALTHY→WARNING→CRITICAL"]
        DB[("SQLite")]
        WS["WebSocket hub"]
    end

    subgraph AI["Aurora AI · Python :8001"]
        FC["Forecast + reroute scoring"]
    end

    subgraph UI["Dashboard · React :5173"]
        MAP["Tactical map"]
        LOGIN["Duo-gated login"]
    end

    SIM --> ING
    S1 & S2 & S3 --> MER
    MER --> ING
    TE --> ST
    ING --> ST --> DB
    ST --> FC
    FC --> ST
    ST --> WX
    ST --> WS
    WS --> MAP
    LOGIN --> DUO
    WX -.optional webhook.-> ING
```

---

## Diagram 2 — Golden path sequence (crisis workflow)

Core user journey demonstrated in the 5-minute pitch.

```mermaid
sequenceDiagram
    autonumber
    participant Sen as Sensor / simulator
    participant API as Aurora API
    participant AI as AI service
    participant WX as Webex
    participant CO as Coordinator
    participant UI as Dashboard

    Sen->>API: Shelter B telemetry spike
    API->>UI: WebSocket — shelter turns CRITICAL
    API->>AI: Forecast + reroute request
    AI-->>API: Recommend Shelter D + reasons
    API->>WX: Adaptive Card alert
    WX-->>CO: Notification in coordinator space
    CO->>UI: AUTHORIZE REROUTE
    API->>UI: WebSocket — reroute active, map updates
```

---

## Diagram 3 — Authentication flow (Duo MFA)

How coordinator login is secured before dashboard access.

```mermaid
sequenceDiagram
    participant UI as Login page
    participant API as Aurora API
    participant DUO as Duo Auth API

    UI->>API: POST /api/auth/login (user, push or passcode)
    API->>DUO: Verify push / passcode
    DUO-->>API: allow / deny
    API-->>UI: Session token (Bearer)
    UI->>API: REST + WebSocket with Authorization header
```

---

## Diagram 4 — Shelter state model

Rules that drive map color and alert severity.

```mermaid
stateDiagram-v2
    [*] --> HEALTHY
    HEALTHY --> WARNING: occupancy > 75% OR degraded air OR uplink jitter
    WARNING --> CRITICAL: occupancy > 90% OR unsafe air OR uplink down
    CRITICAL --> WARNING: reroute active / mitigated
    WARNING --> HEALTHY: normalized
```

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [ADR.md](../ADR.md) | Why these architectural choices were made |
| [PROJECT.md](../PROJECT.md) | Full problem statement, data model, roadmap |
| [API_CONTRACT.md](../API_CONTRACT.md) | REST/WebSocket integration contract |
