import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AlertFeed } from "./AlertFeed";
import { SystemStatus } from "./SystemStatus";
import { ReroutePanel } from "./ReroutePanel";
import { ShelterCard } from "./ShelterCard";
import { ShelterMap } from "./ShelterMap";
import { useLiveData } from "../hooks/useLiveData";
import type { Alert } from "../types";

export function Dashboard() {
  const { username, mode, logout, token } = useAuth();
  const { shelters, alerts, connected, loading, error, activeReroute, acceptReroute, useMock, lastEvent } =
    useLiveData(token);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [acceptBusy, setAcceptBusy] = useState(false);

  const openCritical = useMemo(
    () => alerts.find((a) => a.status === "OPEN" && a.severity === "CRITICAL") ?? null,
    [alerts]
  );

  const latestResolved = useMemo(
    () =>
      alerts.find((a) => a.status === "RESOLVED" && a.severity === "CRITICAL" && a.recommendation) ??
      null,
    [alerts]
  );

  const panelAlert = selectedAlert ?? openCritical ?? latestResolved;

  async function handleAccept(alertId: string) {
    setAcceptBusy(true);
    try {
      await acceptReroute(alertId);
    } finally {
      setAcceptBusy(false);
    }
  }

  const criticalCount = shelters.filter((s) => s.state === "CRITICAL").length;
  const warningCount = shelters.filter((s) => s.state === "WARNING").length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Aurora Command Center</h1>
          <p className="subtitle">
            Live disaster shelter operations · {username} · {mode ?? "session"} auth
          </p>
          <SystemStatus />
        </div>
        <div className="topbar-meta">
          <span className={`live-dot ${connected ? "on" : "off"}`} />
          {connected ? "Live" : "Offline"} · {useMock ? "mock" : "API"}
          {lastEvent && <span className="last-event"> · {lastEvent}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-value">{shelters.length}</span>
          <span className="stat-label">Shelters</span>
        </div>
        <div className="stat stat-warn">
          <span className="stat-value">{warningCount}</span>
          <span className="stat-label">Warning</span>
        </div>
        <div className="stat stat-crit">
          <span className="stat-value">{criticalCount}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className="stat">
          <span className="stat-value">{alerts.filter((a) => a.status === "OPEN").length}</span>
          <span className="stat-label">Open alerts</span>
        </div>
      </div>

      {error && <p className="banner-error">{error}</p>}
      {loading && <p className="banner-loading">Loading shelter data…</p>}

      <div className="dashboard-grid">
        <section className="panel map-panel">
          <h2>Live map</h2>
          <ShelterMap shelters={shelters} activeReroute={activeReroute} />
        </section>

        <section className="panel">
          <h2>Shelters</h2>
          <div className="shelter-list">
            {shelters.map((s) => (
              <ShelterCard key={s.id} shelter={s} />
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Alerts</h2>
          <AlertFeed alerts={alerts} selectedId={panelAlert?.id} onSelect={setSelectedAlert} />
        </section>

        <section className="panel">
          <h2>Reroute</h2>
          <ReroutePanel
            alert={panelAlert}
            activeReroute={activeReroute}
            shelters={shelters}
            onAccept={handleAccept}
            busy={acceptBusy}
          />
        </section>
      </div>
    </div>
  );
}
