import type { Alert } from "../types";

interface Props {
  alerts: Alert[];
  onSelect: (alert: Alert) => void;
  selectedId?: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AlertFeed({ alerts, onSelect, selectedId }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="incident-empty">
        <span className="incident-empty-icon">◉</span>
        <p>ALL SECTORS NOMINAL</p>
        <span className="mono">No active incidents</span>
      </div>
    );
  }

  return (
    <ul className="incident-feed">
      {alerts.map((alert) => {
        const sev = alert.severity.toLowerCase();
        return (
          <li key={alert.id}>
            <button
              type="button"
              className={`incident-item severity-${sev} ${selectedId === alert.id ? "selected" : ""} ${alert.status === "OPEN" ? "open" : ""}`}
              onClick={() => onSelect(alert)}
            >
              <div className="incident-stripe" aria-hidden />
              <div className="incident-body">
                <div className="incident-head">
                  <span className={`incident-sev severity-${sev}`}>{alert.severity}</span>
                  <time className="mono">{formatTime(alert.createdAt)}</time>
                </div>
                <p className="incident-msg">{alert.message}</p>
                <div className="incident-foot">
                  <span className={`incident-status ${alert.status.toLowerCase()}`}>{alert.status}</span>
                  <span className="mono incident-id">{alert.id.slice(0, 8)}</span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
