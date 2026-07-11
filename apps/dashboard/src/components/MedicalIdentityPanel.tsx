import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useFaceApi } from "../hooks/useFaceApi";
import type { EvacueeMedicalPublic, MedicalIdentifyResponse } from "../types/medical";
import { MedicalProfileCard } from "./MedicalProfileCard";

type Tab = "scan" | "lookup" | "register";

const DEMO_IDS = ["AUR-1001", "AUR-1002", "AUR-1003", "AUR-1004"];

interface Props {
  onClose: () => void;
}

export function MedicalIdentityPanel({ onClose }: Props) {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("lookup");
  const [lookupId, setLookupId] = useState("AUR-1001");
  const [profile, setProfile] = useState<EvacueeMedicalPublic | null>(null);
  const [matchConfidence, setMatchConfidence] = useState<number | undefined>();
  const [method, setMethod] = useState<"face_scan" | "id_lookup" | "register">("id_lookup");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const face = useFaceApi();

  const [form, setForm] = useState({
    evacueeId: "AUR-NEW",
    fullName: "",
    age: "30",
    bloodGroup: "O+",
    allergies: "",
    conditions: "",
    medications: "",
    emergencyContact: "",
    notes: "",
  });

  useEffect(() => {
    if (tab === "scan" || tab === "register") {
      void face.init();
    }
    return () => {
      face.stopCamera();
      setCameraOn(false);
    };
  }, [tab]);

  async function handleLookup(id?: string) {
    const code = (id ?? lookupId).trim();
    if (!code) return;
    setError(null);
    setBusy(true);
    setProfile(null);
    try {
      const res = await apiFetch<{ profile: EvacueeMedicalPublic }>(
        `/api/medical/evacuees/${encodeURIComponent(code)}`,
        { token }
      );
      setProfile(res.profile);
      setMatchConfidence(undefined);
      setMethod("id_lookup");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleFaceScan() {
    setError(null);
    setBusy(true);
    setProfile(null);
    try {
      if (!cameraOn) {
        await face.startCamera();
        setCameraOn(true);
        setBusy(false);
        return;
      }

      const descriptor = await face.captureDescriptor();
      if (!descriptor) {
        setError("No face detected — center the evacuee in frame and try again");
        setBusy(false);
        return;
      }

      const res = await apiFetch<MedicalIdentifyResponse>("/api/medical/identify", {
        method: "POST",
        token,
        body: JSON.stringify({ descriptor }),
      });

      setProfile(res.profile);
      setMatchConfidence(res.match?.confidence);
      setMethod("face_scan");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Face scan failed";
      setError(
        msg.includes("No face profiles")
          ? `${msg} — use ID lookup (e.g. AUR-1001) or register face at intake first`
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let descriptor: number[] | null = null;
      if (cameraOn) {
        descriptor = await face.captureDescriptor();
      }

      const res = await apiFetch<{ profile: EvacueeMedicalPublic }>("/api/medical/evacuees", {
        method: "POST",
        token,
        body: JSON.stringify({
          evacueeId: form.evacueeId.trim(),
          fullName: form.fullName.trim(),
          age: Number(form.age),
          bloodGroup: form.bloodGroup.trim(),
          allergies: form.allergies,
          conditions: form.conditions,
          medications: form.medications,
          emergencyContact: form.emergencyContact.trim(),
          notes: form.notes.trim(),
          faceDescriptor: descriptor,
        }),
      });

      setProfile(res.profile);
      setMatchConfidence(undefined);
      setMethod("register");
      setTab("lookup");
      setLookupId(res.profile.evacueeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRegisterCamera() {
    if (cameraOn) {
      face.stopCamera();
      setCameraOn(false);
      return;
    }
    await face.startCamera();
    setCameraOn(true);
  }

  return (
    <div className="medical-overlay" role="dialog" aria-labelledby="medical-title">
      <div className="medical-panel">
        <header className="medical-panel-head">
          <div>
            <p className="mono medical-panel-code">SEC-05 · MEDICAL IDENTITY</p>
            <h2 id="medical-title">EVACUEE MEDICAL REGISTRY</h2>
            <p className="medical-panel-sub">
              Pre-disaster health profiles · face scan or ID lookup · Duo-secured
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕ CLOSE
          </button>
        </header>

        <nav className="medical-tabs">
          {(["lookup", "scan", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`medical-tab ${tab === t ? "active" : ""}`}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
            >
              {t === "lookup" ? "ID LOOKUP" : t === "scan" ? "FACE SCAN" : "REGISTER"}
            </button>
          ))}
        </nav>

        <div className="medical-body">
          <div className="medical-actions">
            {tab === "lookup" && (
              <>
                <label className="field-label">
                  <span className="mono">EVACUEE ID / QR</span>
                  <input
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value.toUpperCase())}
                    placeholder="AUR-1001"
                    className="mono"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-emergency"
                  disabled={busy}
                  onClick={() => handleLookup()}
                >
                  {busy ? "SEARCHING…" : "RETRIEVE MEDICAL PROFILE"}
                </button>
                <p className="medical-hint mono">Demo pre-registered IDs:</p>
                <div className="demo-id-row">
                  {DEMO_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setLookupId(id);
                        void handleLookup(id);
                      }}
                    >
                      {id}
                    </button>
                  ))}
                </div>
              </>
            )}

            {tab === "scan" && (
              <>
                <div className="medical-camera-wrap">
                  <video
                    ref={face.videoRef}
                    className="medical-camera"
                    muted
                    playsInline
                    aria-label="Face scan camera"
                  />
                  {!cameraOn && (
                    <div className="medical-camera-placeholder mono">
                      CAMERA OFF · START TO SCAN FACE
                    </div>
                  )}
                </div>
                {(face.loading || !face.ready) && (
                  <p className="medical-hint mono">Loading biometric models…</p>
                )}
                {face.error && <p className="medical-error">{face.error}</p>}
                <button
                  type="button"
                  className="btn btn-emergency"
                  disabled={busy || face.loading}
                  onClick={() => void handleFaceScan()}
                >
                  {busy
                    ? "PROCESSING…"
                    : cameraOn
                      ? "CAPTURE & IDENTIFY"
                      : "START CAMERA & SCAN"}
                </button>
                <p className="medical-hint">
                  Scan works after face enrollment at intake. For demo, use <strong>AUR-1001</strong>{" "}
                  ID lookup, or register a face in the Register tab.
                </p>
              </>
            )}

            {tab === "register" && (
              <form className="medical-register-form" onSubmit={handleRegister}>
                <label className="field-label">
                  <span className="mono">EVACUEE ID</span>
                  <input
                    value={form.evacueeId}
                    onChange={(e) => setForm({ ...form, evacueeId: e.target.value.toUpperCase() })}
                    required
                  />
                </label>
                <label className="field-label">
                  <span className="mono">FULL NAME</span>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </label>
                <div className="medical-form-row">
                  <label className="field-label">
                    <span className="mono">AGE</span>
                    <input
                      type="number"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field-label">
                    <span className="mono">BLOOD GROUP</span>
                    <input
                      value={form.bloodGroup}
                      onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                      required
                    />
                  </label>
                </div>
                <label className="field-label">
                  <span className="mono">ALLERGIES (comma-separated)</span>
                  <input
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    placeholder="Penicillin, Peanuts"
                  />
                </label>
                <label className="field-label">
                  <span className="mono">CONDITIONS</span>
                  <input
                    value={form.conditions}
                    onChange={(e) => setForm({ ...form, conditions: e.target.value })}
                    placeholder="Asthma, Diabetes"
                  />
                </label>
                <label className="field-label">
                  <span className="mono">MEDICATIONS</span>
                  <input
                    value={form.medications}
                    onChange={(e) => setForm({ ...form, medications: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  <span className="mono">EMERGENCY CONTACT</span>
                  <input
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  />
                </label>
                <label className="field-label">
                  <span className="mono">NOTES</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                  />
                </label>

                <div className="medical-camera-wrap small">
                  <video ref={face.videoRef} className="medical-camera" muted playsInline />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void toggleRegisterCamera()}
                  >
                    {cameraOn ? "STOP CAMERA" : "CAPTURE FACE (OPTIONAL)"}
                  </button>
                </div>

                <button type="submit" className="btn btn-emergency" disabled={busy}>
                  {busy ? "REGISTERING…" : "REGISTER EVACUEE"}
                </button>
              </form>
            )}

            {error && (
              <div className="medical-error-box">
                <span className="mono">ACCESS DENIED / NOT FOUND</span>
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="medical-result">
            {profile ? (
              <MedicalProfileCard
                profile={profile}
                matchConfidence={matchConfidence}
                method={method}
              />
            ) : (
              <div className="medical-empty mono">
                <p>NO PROFILE LOADED</p>
                <p className="muted">
                  Lookup a pre-registered evacuee or scan at intake when family is not present.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
