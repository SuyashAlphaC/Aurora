import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getWsUrl } from "../api/client";
import alertsMock from "../mocks/alerts.json";
import sheltersMock from "../mocks/shelters.json";
import type { Alert, RerouteAcceptedEvent, Shelter, WsEvent } from "../types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const REROUTE_STORAGE_KEY = "aurora_active_reroute";

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function upsertShelter(list: Shelter[], updated: Shelter): Shelter[] {
  const i = list.findIndex((s) => s.id === updated.id);
  if (i === -1) return [...list, updated];
  const next = [...list];
  next[i] = updated;
  return next;
}

function loadStoredReroute(): RerouteAcceptedEvent | null {
  try {
    const raw = sessionStorage.getItem(REROUTE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RerouteAcceptedEvent;
  } catch {
    return null;
  }
}

function storeReroute(event: RerouteAcceptedEvent): void {
  sessionStorage.setItem(REROUTE_STORAGE_KEY, JSON.stringify(event));
}

function rerouteFromResolvedAlert(alerts: Alert[]): RerouteAcceptedEvent | null {
  const resolved = alerts.find(
    (a) => a.status === "RESOLVED" && a.severity === "CRITICAL" && a.recommendation
  );
  if (!resolved?.recommendation) return null;
  return {
    alertId: resolved.id,
    fromShelterId: resolved.shelterId,
    toShelterId: resolved.recommendation.toShelterId,
    acceptedAt: resolved.createdAt,
  };
}

export function useLiveData(token: string | null) {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [activeReroute, setActiveReroute] = useState<RerouteAcceptedEvent | null>(() =>
    loadStoredReroute()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadInitial = useCallback(async () => {
    if (USE_MOCK) {
      setShelters(sheltersMock.shelters as Shelter[]);
      setAlerts(sortAlerts(alertsMock.alerts as Alert[]));
      setLoading(false);
      return;
    }

    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const [shelterRes, alertRes] = await Promise.all([
        apiFetch<{ shelters: Shelter[] }>("/api/shelters", { token }),
        apiFetch<{ alerts: Alert[] }>("/api/alerts?limit=20", { token }),
      ]);
      setShelters(shelterRes.shelters);
      const sorted = sortAlerts(alertRes.alerts);
      setAlerts(sorted);
      setActiveReroute((prev) => prev ?? loadStoredReroute() ?? rerouteFromResolvedAlert(sorted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (USE_MOCK || !token) {
      if (USE_MOCK) setConnected(true);
      return;
    }

    const ws = new WebSocket(getWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WsEvent;
        setLastEvent(msg.event);

        if (msg.event === "shelter.updated") {
          setShelters((prev) => upsertShelter(prev, msg.data as Shelter));
        } else if (msg.event === "alert.created") {
          setAlerts((prev) => sortAlerts([msg.data as Alert, ...prev]));
        } else if (msg.event === "reroute.accepted") {
          const data = msg.data as RerouteAcceptedEvent;
          setActiveReroute(data);
          storeReroute(data);
          setAlerts((prev) =>
            prev.map((a) => (a.id === data.alertId ? { ...a, status: "RESOLVED" as const } : a))
          );
        }
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    if (!USE_MOCK) return;

    const interval = setInterval(() => {
      setShelters((prev) =>
        prev.map((s) =>
          s.id === "shelter-b"
            ? {
                ...s,
                currentOccupancy: Math.min(s.currentOccupancy + 1, s.capacity),
                occupancyPct: Math.min(
                  100,
                  Math.round(((s.currentOccupancy + 1) / s.capacity) * 100)
                ),
                state:
                  s.currentOccupancy + 1 >= 180
                    ? "CRITICAL"
                    : s.currentOccupancy + 1 >= 150
                      ? "WARNING"
                      : "HEALTHY",
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const acceptReroute = useCallback(
    async (alertId: string) => {
      if (USE_MOCK) {
        const alert = alerts.find((a) => a.id === alertId);
        if (alert?.recommendation) {
          const event: RerouteAcceptedEvent = {
            alertId,
            fromShelterId: alert.shelterId,
            toShelterId: alert.recommendation.toShelterId,
            acceptedAt: new Date().toISOString(),
          };
          setActiveReroute(event);
          storeReroute(event);
          setAlerts((prev) =>
            prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED" } : a))
          );
        }
        return;
      }

      if (!token) return;
      const result = await apiFetch<{
        status: "RESOLVED";
        fromShelterId: string;
        toShelterId: string;
        acceptedAt: string;
      }>(`/api/reroute/${alertId}/accept`, { method: "POST", token });

      const event: RerouteAcceptedEvent = {
        alertId,
        fromShelterId: result.fromShelterId,
        toShelterId: result.toShelterId,
        acceptedAt: result.acceptedAt,
      };
      setActiveReroute(event);
      storeReroute(event);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "RESOLVED" as const } : a))
      );
    },
    [token, alerts]
  );

  return {
    shelters,
    alerts,
    connected,
    lastEvent,
    activeReroute,
    loading,
    error,
    acceptReroute,
    reload: loadInitial,
    useMock: USE_MOCK,
  };
}
