import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { Dashboard } from "./components/Dashboard";

function AppGate() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p className="muted">Checking session…</p>
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
