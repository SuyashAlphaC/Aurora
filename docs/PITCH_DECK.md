# Aurora — 3-Slide Pitch Deck

> Code With Cisco 2026 · Silver Flag · Resilient Disaster Response

---

## Slide 1 — Problem & Users

### When disaster strikes, coordinators can't answer three questions fast enough

1. **Which shelters have room right now?** (manual phone trees → ~15 min delays)
2. **Are shelters safe to occupy?** (air quality, water — nobody watches continuously)
3. **Is connectivity still up?** (network fails silently; ops find out too late)

**Who hurts:** Disaster coordinators, shelter managers, evacuees sent to full or unsafe shelters.

**Baseline:** 15-min assignment decisions · 1–3 hr to detect over-capacity · 15–45 min to detect outages.

---

## Slide 2 — Solution & Impact

### Aurora: Cisco-powered live command center

**One dashboard** → occupancy + environment + network health → **AI reroute** → **Webex alerts**

| Outcome | Before | With Aurora |
|---|---|---|
| Shelter assignment | ~15 min | **< 30 sec** |
| Over-capacity detection | hours (reactive) | **~15–20 min ahead** (predictive) |
| Outage detection | 15–45 min | **seconds** |

**Golden path:** Shelter B surges → CRITICAL → Webex alert → coordinator accepts reroute → intake to Shelter D.

---

## Slide 3 — Architecture & Cisco Stack

```
Sense (Meraki MT / simulator) → Connect (Meraki API) → Observe (ThousandEyes)
        ↓
   Aurora API (state engine + SQLite)
        ↓
   AI (forecast + explainable reroute) → Engage (Webex) → Secure (Duo)
        ↓
   Coordinator Dashboard (live map + alerts)
```

| Cisco layer | Technology | Role |
|---|---|---|
| **Connect** | Meraki Dashboard API | Shelter uplink health |
| **Sense** | Meraki sensors / simulator | Occupancy, AQI, environment |
| **Observe** | ThousandEyes | Network path reliability |
| **Engage** | Webex Bot + Adaptive Cards | Critical alerts + reroute accept |
| **Secure** | Duo Auth API | MFA-gated coordinator console |
| **Intelligence** | Explainable AI | Capacity forecast + reroute scoring |

**PoC today:** Simulated telemetry + live AI + full pipeline. **Production:** Same stack with physical Meraki hardware.

**GitHub:** Aurora monorepo · Demo video · `scripts/demo-golden-path.sh`

---

## 5-Minute Pitch Script (outline)

1. **0:00–1:00** — Problem story (flood, family sent to full shelter)
2. **1:00–3:00** — Live demo (simulator → dashboard turns red → accept reroute)
3. **3:00–4:00** — Cisco stack walkthrough (not decorative — each layer does work)
4. **4:00–5:00** — Impact numbers + scalability + thank you
