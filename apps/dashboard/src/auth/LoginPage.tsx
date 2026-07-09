import { FormEvent, useState } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { login, verifyPasscode } = useAuth();
  const [username, setUsername] = useState("coordinator");
  const [passcode, setPasscode] = useState("");
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (step === "mfa" && passcode) {
        await verifyPasscode(username, passcode);
        return;
      }

      const res = await login(username, passcode || undefined, passcode ? "passcode" : undefined);

      if (res.requiresMfa) {
        setStep("mfa");
        setPasscode("");
        return;
      }

      if (!res.token) {
        setError(res.message ?? "Login did not return a session token");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePush() {
    setError(null);
    setBusy(true);
    try {
      await login(username, undefined, "push");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Duo push failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bunker-gate">
      <div className="scanlines" aria-hidden />
      <div className="grid-bg" aria-hidden />
      <div className="radar-sweep" aria-hidden />

      <div className="bunker-classification mono">RESTRICTED · DISASTER RESPONSE EOC</div>

      <div className="bunker-card">
        <div className="hazard-stripe" aria-hidden />

        <div className="bunker-brand">
          <img className="bunker-logo" src="/aurora-logo.png" alt="Aurora" width={88} height={88} />
          <p className="bunker-eyebrow mono">EMERGENCY OPERATIONS GATEWAY</p>
          <h1 className="bunker-title">AURORA</h1>
          <p className="bunker-tagline">Light through the storm · Cisco-powered command center</p>
        </div>

        <div className="bunker-status mono">
          <span className="status-led" />
          SECURE CHANNEL READY · DUO MFA REQUIRED
        </div>

        <form onSubmit={handleSubmit} className="bunker-form">
          <label className="field-label">
            <span className="mono">OPERATOR ID</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={step === "mfa"}
              placeholder="coordinator"
            />
          </label>

          {(step === "mfa" || passcode) && (
            <label className="field-label">
              <span className="mono">{step === "mfa" ? "DUO PASSCODE" : "PASSCODE (OPTIONAL)"}</span>
              <input
                type="text"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="one-time-code"
                placeholder={step === "mfa" ? "000000" : "Leave blank if Duo not configured"}
                required={step === "mfa"}
              />
            </label>
          )}

          {error && (
            <div className="bunker-error">
              <span className="mono">AUTH DENIED</span>
              <p>{error}</p>
            </div>
          )}

          <button type="submit" className="btn btn-emergency" disabled={busy}>
            {busy ? "AUTHENTICATING…" : step === "mfa" ? "VERIFY PASSCODE" : "ENTER COMMAND CENTER"}
          </button>

          {step === "credentials" && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={handlePush}>
              DUO PUSH AUTHENTICATION
            </button>
          )}

          {step === "mfa" && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep("credentials")}>
              ← BACK
            </button>
          )}
        </form>

        <p className="bunker-footnote mono">
          UNAUTHORIZED ACCESS PROHIBITED · ALL SESSIONS LOGGED
        </p>
      </div>
    </div>
  );
}
