import type { Alert, RerouteAcceptedEvent, Shelter } from "../types";

interface Props {
  alert: Alert | null;
  activeReroute: RerouteAcceptedEvent | null;
  shelters: Shelter[];
  onAccept: (alertId: string) => void;
  busy: boolean;
}

function shelterName(shelters: Shelter[], id: string): string {
  return shelters.find((s) => s.id === id)?.name ?? id;
}

export function ReroutePanel({ alert, activeReroute, shelters, onAccept, busy }: Props) {
  const resolvedAlert =
    alert?.status === "RESOLVED" && alert.recommendation ? alert : null;

  const display = activeReroute ?? (resolvedAlert
    ? {
        alertId: resolvedAlert.id,
        fromShelterId: resolvedAlert.shelterId,
        toShelterId: resolvedAlert.recommendation!.toShelterId,
        acceptedAt: resolvedAlert.createdAt,
      }
    : null);

  if (display) {
    const fromName = shelterName(shelters, display.fromShelterId);
    const toName =
      resolvedAlert?.recommendation?.toShelterName ??
      shelterName(shelters, display.toShelterId);
    const reasons = resolvedAlert?.recommendation?.reasons ?? alert?.recommendation?.reasons ?? [];

    return (
      <div className="dispatch-panel active">
        <div className="dispatch-badge">
          <span className="dispatch-led" />
          REROUTE ACTIVE
        </div>
        <h3 className="dispatch-title">INTAKE REDIRECTED</h3>
        <div className="dispatch-flow">
          <div className="dispatch-node from">
            <span className="mono">FROM</span>
            <strong>{fromName}</strong>
          </div>
          <div className="dispatch-arrow">→</div>
          <div className="dispatch-node to">
            <span className="mono">TO</span>
            <strong>{toName}</strong>
          </div>
        </div>
        {reasons.length > 0 && (
          <ul className="dispatch-reasons">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <p className="dispatch-time mono">
          ACTIVE SINCE {new Date(display.acceptedAt).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (!alert?.recommendation) {
    return (
      <div className="dispatch-panel idle">
        <div className="dispatch-idle-icon">◎</div>
        <h3 className="dispatch-title">AWAITING INCIDENT</h3>
        <p>Select a critical alert to view AI reroute recommendation.</p>
      </div>
    );
  }

  const rec = alert.recommendation;

  return (
    <div className="dispatch-panel pending">
      <div className="dispatch-badge warn">
        <span className="dispatch-led warn" />
        ACTION REQUIRED
      </div>
      <h3 className="dispatch-title">REROUTE ORDER</h3>
      <p className="dispatch-target">
        Redirect intake to <strong>{rec.toShelterName}</strong>
      </p>
      <p className="dispatch-eta mono">
        CAPACITY BREACH IN ~{rec.etaMinutes} MIN
      </p>
      <ul className="dispatch-reasons">
        {rec.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {alert.status === "OPEN" && (
        <button
          type="button"
          className="btn btn-emergency btn-wide"
          disabled={busy}
          onClick={() => onAccept(alert.id)}
        >
          {busy ? "EXECUTING…" : "▸ AUTHORIZE REROUTE"}
        </button>
      )}
    </div>
  );
}
