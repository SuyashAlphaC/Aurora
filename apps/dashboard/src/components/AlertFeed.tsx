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
    return <p className="empty-state">No alerts — all shelters nominal.</p>;
  }

  return (
    <ul className="alert-feed">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <button
            type="button"
            className={`alert-item severity-${alert.severity.toLowerCase()} ${selectedId === alert.id ? "selected" : ""}`}
            onClick={() => onSelect(alert)}
          >
            <div className="alert-item-head">
              <span className={`pill severity-${alert.severity.toLowerCase()}`}>{alert.severity}</span>
              <time>{formatTime(alert.createdAt)}</time>
            </div>
            <p>{alert.message}</p>
            <span className="alert-status">{alert.status}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
