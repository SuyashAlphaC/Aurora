import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { Dashboard } from "./components/Dashboard";

function AppGate() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="bunker-gate">
        <div className="scanlines" aria-hidden />
        <div className="grid-bg" aria-hidden />
        <div className="bunker-card" style={{ textAlign: "center" }}>
          <p className="bunker-eyebrow mono">INITIALIZING SECURE CHANNEL</p>
          <p className="mono" style={{ color: "var(--cyan)", marginTop: "1rem" }}>
            VERIFYING SESSION…
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
