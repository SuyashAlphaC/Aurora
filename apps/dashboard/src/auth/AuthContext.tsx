import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../api/client";
import type { LoginResponse } from "../types";

const TOKEN_KEY = "aurora_token";
const USER_KEY = "aurora_user";

interface AuthState {
  token: string | null;
  username: string | null;
  mode: string | null;
  loading: boolean;
  login: (username: string, passcode?: string, factor?: "passcode" | "push" | "dev") => Promise<LoginResponse>;
  verifyPasscode: (username: string, passcode: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USER_KEY));
  const [mode, setMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<{ username: string }>("/api/auth/me", { token })
      .then((me) => {
        setUsername(me.username);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUsername(null);
        setLoading(false);
      });
  }, [token]);

  const persistSession = useCallback((t: string, user: string, authMode: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, user);
    setToken(t);
    setUsername(user);
    setMode(authMode);
  }, []);

  const login = useCallback(
    async (user: string, passcode?: string, factor?: "passcode" | "push" | "dev") => {
      const body: Record<string, string> = { username: user };
      if (passcode) body.passcode = passcode;
      if (factor) body.factor = factor;

      const res = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.token && res.username) {
        persistSession(res.token, res.username, res.mode ?? "unknown");
      }

      return res;
    },
    [persistSession]
  );

  const verifyPasscode = useCallback(
    async (user: string, passcode: string) => {
      const res = await apiFetch<LoginResponse>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ username: user, passcode }),
      });
      if (res.token && res.username) {
        persistSession(res.token, res.username, res.mode ?? "duo");
      }
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUsername(null);
    setMode(null);
  }, []);

  const value = useMemo(
    () => ({ token, username, mode, loading, login, verifyPasscode, logout }),
    [token, username, mode, loading, login, verifyPasscode, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
