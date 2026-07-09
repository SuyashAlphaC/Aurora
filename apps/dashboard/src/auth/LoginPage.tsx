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
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">✦</span>
          <h1>Aurora</h1>
          <p>Light through the storm · Cisco-powered command center</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={step === "mfa"}
            />
          </label>

          {(step === "mfa" || passcode) && (
            <label>
              {step === "mfa" ? "Duo passcode" : "Passcode (optional)"}
              <input
                type="text"
                inputMode="numeric"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="one-time-code"
                placeholder={step === "mfa" ? "6-digit code" : "Leave blank if Duo not configured"}
                required={step === "mfa"}
              />
            </label>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : step === "mfa" ? "Verify passcode" : "Sign in"}
          </button>

          {step === "credentials" && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={handlePush}>
              Sign in with Duo Push
            </button>
          )}

          {step === "mfa" && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep("credentials")}>
              ← Back
            </button>
          )}
        </form>

        <p className="login-footnote">
          Without Duo credentials on the API, sign-in issues a coordinator session token after username only.
        </p>
      </div>
    </div>
  );
}
