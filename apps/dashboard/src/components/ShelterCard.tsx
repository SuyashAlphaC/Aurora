import type { Shelter } from "../types";

interface Props {
  shelter: Shelter;
}

const STATE_LABEL: Record<Shelter["state"], string> = {
  HEALTHY: "NOMINAL",
  WARNING: "ELEVATED",
  CRITICAL: "CRITICAL",
};

export function ShelterCard({ shelter }: Props) {
  const barPct = Math.min(100, shelter.occupancyPct);
  const stateKey = shelter.state.toLowerCase();

  return (
    <article className={`site-card state-${stateKey}`}>
      <div className="site-card-corner tl" aria-hidden />
      <div className="site-card-corner br" aria-hidden />

      <div className="site-head">
        <div>
          <span className="site-id mono">{shelter.id.toUpperCase()}</span>
          <h3>{shelter.name}</h3>
        </div>
        <span className={`site-state state-${shelter.state}`}>{STATE_LABEL[shelter.state]}</span>
      </div>

      <div className="capacity-block">
        <div className="capacity-track">
          <div
            className={`capacity-fill state-${stateKey}`}
            style={{ width: `${barPct}%` }}
          />
          <div className="capacity-markers" aria-hidden>
            <span /><span /><span /><span />
          </div>
        </div>
        <div className="capacity-label mono">
          <span>{shelter.currentOccupancy}</span>
          <span className="capacity-pct">{shelter.occupancyPct}%</span>
          <span>{shelter.capacity}</span>
        </div>
      </div>

      <dl className="site-metrics">
        <div>
          <dt>AQI</dt>
          <dd className={shelter.environment.airQualityIndex >= 150 ? "hot" : ""}>
            {shelter.environment.airQualityIndex}
          </dd>
        </div>
        <div>
          <dt>TEMP</dt>
          <dd>{shelter.environment.temperatureC.toFixed(1)}°C</dd>
        </div>
        <div>
          <dt>NET</dt>
          <dd className={shelter.network.uplinkStatus !== "UP" ? "hot" : ""}>
            {shelter.network.uplinkStatus}
          </dd>
        </div>
        <div>
          <dt>RTT</dt>
          <dd>{shelter.network.latencyMs}ms</dd>
        </div>
      </dl>
    </article>
  );
}
