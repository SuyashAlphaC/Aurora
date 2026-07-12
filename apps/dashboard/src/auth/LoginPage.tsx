import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiFetch, getApiUrl } from "../api/client";
import { useAuth } from "./AuthContext";

type AuthHealth = "loading" | "duo" | "dev" | "disabled" | "unreachable";

export function LoginPage() {
  const { login, verifyPasscode } = useAuth();
  const [username, setUsername] = useState("coordinator");
  const [passcode, setPasscode] = useState("");
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authHealth, setAuthHealth] = useState<AuthHealth>("loading");

  useEffect(() => {
    apiFetch<{ auth: string }>("/api/health")
      .then((h) => {
        if (h.auth === "duo") setAuthHealth("duo");
        else if (h.auth === "disabled") setAuthHealth("disabled");
        else setAuthHealth("dev");
      })
      .catch(() => setAuthHealth("unreachable"));
  }, []);

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

      if (res.token && res.mode === "dev" && (passcode || step === "mfa")) {
        setError("Login returned a dev session — Duo MFA did not run. Check services/api/.env");
        return;
      }

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
    if (authHealth !== "duo") {
      setError(
        "Duo is not active on the API (missing services/api/.env). Push was not sent — restore DUO_CLIENT_ID, DUO_CLIENT_SECRET, DUO_API_HOST and restart the API."
      );
      return;
    }
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

        <div className={`bunker-status mono ${authHealth === "duo" ? "" : "bunker-status-warn"}`}>
          <span className={`status-led ${authHealth === "duo" ? "" : "status-led-warn"}`} />
          {authHealth === "loading" && "CHECKING API & DUO STATUS…"}
          {authHealth === "duo" && "SECURE CHANNEL READY · DUO MFA REQUIRED"}
          {authHealth === "disabled" && "AUTH DISABLED · DEV MODE ONLY"}
          {authHealth === "dev" && "DUO NOT CONFIGURED ON API · PUSH DISABLED"}
          {authHealth === "unreachable" &&
            `API UNREACHABLE (${getApiUrl()}) · DEPLOY services/api + SET VITE_API_URL ON VERCEL`}
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
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || authHealth !== "duo"}
              onClick={handlePush}
            >
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
