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
      <div className="reroute-panel resolved">
        <div className="reroute-active-badge">✓ Reroute active</div>
        <h3>Intake redirected</h3>
        <p className="reroute-flow">
          New arrivals at <strong>{fromName}</strong> are being sent to{" "}
          <strong>{toName}</strong>
        </p>
        {reasons.length > 0 && (
          <ul className="reasons">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <p className="muted reroute-time">
          Active since {new Date(display.acceptedAt).toLocaleTimeString()}
        </p>
      </div>
    );
  }

  if (!alert?.recommendation) {
    return (
      <div className="reroute-panel empty">
        <h3>Reroute recommendation</h3>
        <p className="muted">Select a critical alert to view AI reroute suggestion.</p>
      </div>
    );
  }

  const rec = alert.recommendation;

  return (
    <div className="reroute-panel pending">
      <h3>Reroute recommendation</h3>
      <p className="reroute-target">
        Send new arrivals to <strong>{rec.toShelterName}</strong>
      </p>
      <p className="eta">Estimated capacity breach in ~{rec.etaMinutes} min</p>
      <ul className="reasons">
        {rec.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {alert.status === "OPEN" && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => onAccept(alert.id)}
        >
          {busy ? "Accepting…" : "Accept reroute"}
        </button>
      )}
    </div>
  );
}
