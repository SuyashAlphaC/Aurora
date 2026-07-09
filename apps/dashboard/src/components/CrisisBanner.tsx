interface Props {
  criticalCount: number;
  warningCount: number;
  openAlerts: number;
}

export function CrisisBanner({ criticalCount, warningCount, openAlerts }: Props) {
  const level =
    criticalCount > 0 ? "DEFCON-1" : warningCount > 0 ? "DEFCON-2" : openAlerts > 0 ? "ELEVATED" : "NOMINAL";

  const levelClass =
    criticalCount > 0 ? "crisis-1" : warningCount > 0 ? "crisis-2" : openAlerts > 0 ? "crisis-3" : "crisis-ok";

  return (
    <div className={`crisis-banner ${levelClass}`}>
      <div className="crisis-banner-inner">
        <span className="crisis-label">THREAT LEVEL</span>
        <span className="crisis-level">{level}</span>
        <span className="crisis-divider" />
        <span className="crisis-stat">
          <strong>{criticalCount}</strong> CRITICAL
        </span>
        <span className="crisis-stat">
          <strong>{warningCount}</strong> WARNING
        </span>
        <span className="crisis-stat">
          <strong>{openAlerts}</strong> OPEN ALERTS
        </span>
        {criticalCount > 0 && (
          <span className="crisis-flash">⚠ MASS CASUALTY EVENT PROTOCOL — COORDINATE REROUTES IMMEDIATELY</span>
        )}
      </div>
    </div>
  );
}
