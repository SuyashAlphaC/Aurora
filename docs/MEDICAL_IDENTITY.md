# Evacuee Medical Identity

Pre-disaster health profiles for shelter intake — when family is not present, coordinators can retrieve blood group, allergies, conditions, and medications via **ID lookup** or **face scan**.

## Access

- **Duo-secured** — all `/api/medical/*` routes require coordinator session (`Authorization: Bearer <token>`).
- Dashboard: click **MEDICAL ID** in the command header.

## Demo evacuees (pre-seeded)

| ID | Name | Highlights |
|----|------|------------|
| `AUR-1001` | Priya Sharma | O+, penicillin/shellfish allergy, asthma |
| `AUR-1002` | Raj Malhotra | B+, diabetes + hypertension |
| `AUR-1003` | Meera Khan | AB-, pediatric, peanuts/latex, epilepsy |
| `AUR-1004` | James Okafor | A+, prior MI, iodine contrast allergy |

**Quick demo:** Open Medical ID → **ID LOOKUP** → click `AUR-1001` → profile loads instantly.

## Face scan flow

1. **Pre-disaster:** citizens register health data (Register tab or municipal portal in production).
2. **At intake:** optional face capture stores a 128-dim embedding (browser-side `@vladmandic/face-api`).
3. **During crisis:** coordinator scans face → API matches embedding → medical card displayed.

Face scan requires enrollment first:

1. Medical ID → **REGISTER**
2. Use existing ID (e.g. `AUR-1001`) or new ID, fill medical fields
3. Click **CAPTURE FACE** → **REGISTER EVACUEE**
4. Switch to **FACE SCAN** → start camera → **CAPTURE & IDENTIFY**

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/medical/evacuees` | List profiles (no embeddings) |
| `GET` | `/api/medical/evacuees/:evacueeId` | Lookup by ID / QR |
| `POST` | `/api/medical/identify` | Body: `{ descriptor: number[128] }` |
| `POST` | `/api/medical/evacuees` | Register or update profile |
| `POST` | `/api/medical/evacuees/:id/face` | Update face embedding only |

All lookups are written to `medical_access_log` for audit.

## Privacy (production notes)

- Consent required at pre-registration; embeddings are one-way features, not photos.
- Role-based access (medic vs coordinator); encryption at rest; regional data residency.
- Face scan is a supplement — **ID/QR wristband** remains the reliable fallback in the field.

## Cisco narrative

| Layer | Role |
|-------|------|
| **Secure** | Duo MFA gates medical API |
| **Sense** | Meraki MV / intake camera (same stack as occupancy) |
| **Engage** | (Roadmap) Webex alert to field medic on severe allergy match |
