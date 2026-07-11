import type { EvacueeMedicalPublic } from "../types/medical";

interface Props {
  profile: EvacueeMedicalPublic;
  matchConfidence?: number;
  method?: "face_scan" | "id_lookup" | "register";
}

export function MedicalProfileCard({ profile, matchConfidence, method }: Props) {
  const hasCriticalAllergy = profile.allergies.length > 0;

  return (
    <div className={`medical-card ${hasCriticalAllergy ? "medical-card-alert" : ""}`}>
      <header className="medical-card-head">
        <div>
          <p className="medical-card-eyebrow mono">EVACUEE MEDICAL ID</p>
          <h3 className="medical-card-name">{profile.fullName}</h3>
          <p className="medical-card-meta mono">
            {profile.evacueeId} · {profile.age} yrs · {profile.bloodGroup}
          </p>
        </div>
        <div className="medical-card-badges">
          {method === "face_scan" && matchConfidence != null && (
            <span className="med-badge med-badge-ok mono">FACE MATCH {matchConfidence}%</span>
          )}
          {profile.hasFaceOnFile && <span className="med-badge mono">BIOMETRIC ON FILE</span>}
        </div>
      </header>

      {hasCriticalAllergy && (
        <div className="medical-alert-strip">
          <span className="mono">⚠ ALLERGY ALERT</span>
          <span>{profile.allergies.join(" · ")}</span>
        </div>
      )}

      <dl className="medical-grid">
        <div className="medical-field">
          <dt className="mono">BLOOD GROUP</dt>
          <dd className="medical-blood">{profile.bloodGroup}</dd>
        </div>
        <div className="medical-field span-2">
          <dt className="mono">ALLERGIES</dt>
          <dd>{profile.allergies.length ? profile.allergies.join(", ") : "None recorded"}</dd>
        </div>
        <div className="medical-field span-2">
          <dt className="mono">CONDITIONS</dt>
          <dd>{profile.conditions.length ? profile.conditions.join(", ") : "None recorded"}</dd>
        </div>
        <div className="medical-field span-2">
          <dt className="mono">MEDICATIONS</dt>
          <dd>{profile.medications.length ? profile.medications.join(", ") : "None recorded"}</dd>
        </div>
        <div className="medical-field span-2">
          <dt className="mono">EMERGENCY CONTACT</dt>
          <dd>{profile.emergencyContact || "—"}</dd>
        </div>
        {profile.notes && (
          <div className="medical-field span-2">
            <dt className="mono">COORDINATOR NOTES</dt>
            <dd>{profile.notes}</dd>
          </div>
        )}
      </dl>

      <footer className="medical-card-foot mono">
        Pre-registered {new Date(profile.registeredAt).toLocaleString()} · Duo-secured access logged
      </footer>
    </div>
  );
}
