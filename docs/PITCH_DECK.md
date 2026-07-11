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

**Extended pain:** When family is missing, hospitals lack allergy and medication context at intake.

---

## Slide 2 — Solution & Impact

### Aurora: Cisco-powered emergency operations center

**One dashboard** → occupancy + environment + network health → **AI reroute** → **Webex alerts** → **Duo MFA** → **Evacuee Medical ID**

| Outcome | Before | With Aurora |
|---|---|---|
| Shelter assignment | ~15 min | **< 30 sec** |
| Over-capacity detection | hours (reactive) | **~15–20 min ahead** (predictive) |
| Outage detection | 15–45 min | **seconds** |
| Medical context at intake | unknown | **ID / face lookup in seconds** |

**Golden path:** Shelter B surges → CRITICAL → Webex alert → coordinator accepts reroute → intake to Shelter D.

**Medical demo:** MEDICAL ID → `AUR-1001` → penicillin allergy + blood group for hospital handoff.

---

## Slide 3 — Architecture & Cisco Stack

```
Sense (simulator / Meraki MT) → Connect (Meraki API) → Observe (TE + rules engine)
        ↓
   Aurora API (state engine + SQLite + Medical registry)
        ↓
   AI (forecast + explainable reroute) → Engage (Webex) → Secure (Duo)
        ↓
   EOC Dashboard (tactical map · alerts · Medical ID SEC-05)
```

| Cisco layer | Technology | Role | PoC |
|---|---|---|---|
| **Connect** | Meraki Dashboard API | Shelter uplink health | API live; demo telemetry simulated |
| **Sense** | Meraki MT / Cisco Spaces | Occupancy, AQI, environment | Simulator (+ production path) |
| **Observe** | ThousandEyes + rules engine | Path probe + Splunk-style correlation | TE health; `state.ts` rules |
| **Engage** | Webex Bot + Adaptive Cards | Critical alerts + reroute accept | **Live** |
| **Secure** | Duo Auth API | MFA-gated console + medical API | **Live** |
| **Intelligence** | Explainable AI | Capacity forecast + reroute scoring | **Live** |

**Roadmap:** Cisco Spaces API, Splunk export, Umbrella DNS — documented, not claimed live.

**GitHub:** https://github.com/SuyashAlphaC/Aurora · `docs/SUBMISSION.md` · `FAST=1 ./scripts/demo-golden-path.sh`

---

## 5-Minute Pitch Script (outline)

1. **0:00–1:00** — Problem story (flood, family sent to full shelter; child allergy unknown)
2. **1:00–3:00** — Live demo (simulator → CRITICAL → Webex → reroute → Medical ID AUR-1001)
3. **3:00–4:00** — Cisco stack walkthrough (real Duo + Webex; honest on simulator/Meraki)
4. **4:00–5:00** — Impact numbers + scalability + thank you
