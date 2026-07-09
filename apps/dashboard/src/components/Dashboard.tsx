import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useClock } from "../hooks/useClock";
import { AlertFeed } from "./AlertFeed";
import { CrisisBanner } from "./CrisisBanner";
import { SystemStatus } from "./SystemStatus";
import { ReroutePanel } from "./ReroutePanel";
import { ShelterCard } from "./ShelterCard";
import { ShelterMap } from "./ShelterMap";
import { useLiveData } from "../hooks/useLiveData";
import type { Alert } from "../types";

export function Dashboard() {
  const { username, mode, logout, token } = useAuth();
  const clock = useClock();
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
  const openAlerts = alerts.filter((a) => a.status === "OPEN").length;

  return (
    <div className="ops-center">
      <div className="scanlines" aria-hidden />
      <div className="grid-bg" aria-hidden />

      <CrisisBanner criticalCount={criticalCount} warningCount={warningCount} openAlerts={openAlerts} />

      <header className="command-header">
        <div className="command-header-left">
          <div className="command-brand">
            <img className="command-logo" src="/aurora-logo.png" alt="" width={48} height={48} />
            <div>
              <p className="command-eyebrow">DISASTER RESPONSE · SILVER FLAG</p>
              <h1 className="command-title">AURORA COMMAND</h1>
              <p className="command-sub">
                OPERATOR <span className="mono">{(username ?? "unknown").toUpperCase()}</span> · AUTH{" "}
                <span className="mono">{(mode ?? "session").toUpperCase()}</span>
              </p>
            </div>
          </div>
          <SystemStatus />
        </div>

        <div className="command-header-right">
          <div className="clock-block">
            <span className="clock-label">OPS TIME</span>
            <time className="clock-value mono">{clock}</time>
          </div>
          <div className="feed-status">
            <span className={`signal-pulse ${connected ? "live" : "dead"}`} />
            <span className="mono">{connected ? "LIVE FEED" : "OFFLINE"}</span>
            <span className="feed-mode">{useMock ? "MOCK" : "API"}</span>
            {lastEvent && <span className="last-event mono">▸ {lastEvent}</span>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            DISCONNECT
          </button>
        </div>
      </header>

      <div className="telemetry-strip">
        <div className="telemetry-cell">
          <span className="telemetry-num">{shelters.length}</span>
          <span className="telemetry-label">SITES ONLINE</span>
        </div>
        <div className="telemetry-cell warn">
          <span className="telemetry-num">{warningCount}</span>
          <span className="telemetry-label">WARNING</span>
        </div>
        <div className={`telemetry-cell crit ${criticalCount > 0 ? "pulse" : ""}`}>
          <span className="telemetry-num">{criticalCount}</span>
          <span className="telemetry-label">CRITICAL</span>
        </div>
        <div className="telemetry-cell">
          <span className="telemetry-num">{openAlerts}</span>
          <span className="telemetry-label">OPEN ALERTS</span>
        </div>
        <div className="telemetry-cell accent">
          <span className="telemetry-num">
            {shelters.reduce((n, s) => n + s.currentOccupancy, 0)}
          </span>
          <span className="telemetry-label">TOTAL OCCUPANCY</span>
        </div>
      </div>

      {error && (
        <div className="banner banner-error">
          <span className="banner-tag">FAULT</span>
          {error}
        </div>
      )}
      {loading && (
        <div className="banner banner-loading">
          <span className="banner-tag">SYNC</span>
          Establishing telemetry uplink…
        </div>
      )}

      <div className="command-grid">
        <section className="hud-panel hud-map span-2">
          <header className="hud-head">
            <span className="hud-code">SEC-01</span>
            <h2>TACTICAL SHELTER MAP</h2>
            <span className="hud-live">RADAR ACTIVE</span>
          </header>
          <ShelterMap shelters={shelters} activeReroute={activeReroute} />
        </section>

        <section className="hud-panel hud-shelters">
          <header className="hud-head">
            <span className="hud-code">SEC-02</span>
            <h2>SITE TELEMETRY</h2>
            <span className="hud-count">{shelters.length} NODES</span>
          </header>
          <div className="shelter-list">
            {shelters.map((s) => (
              <ShelterCard key={s.id} shelter={s} />
            ))}
          </div>
        </section>

        <section className="hud-panel hud-alerts">
          <header className="hud-head">
            <span className="hud-code">SEC-03</span>
            <h2>INCIDENT FEED</h2>
            <span className={`hud-count ${openAlerts > 0 ? "hot" : ""}`}>{openAlerts} ACTIVE</span>
          </header>
          <AlertFeed alerts={alerts} selectedId={panelAlert?.id} onSelect={setSelectedAlert} />
        </section>

        <section className="hud-panel hud-reroute">
          <header className="hud-head">
            <span className="hud-code">SEC-04</span>
            <h2>REROUTE COMMAND</h2>
            <span className="hud-count">AI ASSIST</span>
          </header>
          <ReroutePanel
            alert={panelAlert}
            activeReroute={activeReroute}
            shelters={shelters}
            onAccept={handleAccept}
            busy={acceptBusy}
          />
        </section>
      </div>

      <footer className="command-footer mono">
        AURORA EOC · CISCO MERAKI · WEBEX · DUO · LIGHT THROUGH THE STORM
      </footer>
    </div>
  );
}
