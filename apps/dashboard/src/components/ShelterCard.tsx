import type { Shelter } from "../types";

interface Props {
  shelter: Shelter;
}

export function ShelterCard({ shelter }: Props) {
  const barPct = Math.min(100, shelter.occupancyPct);

  return (
    <article className={`shelter-card state-border-${shelter.state.toLowerCase()}`}>
      <div className="card-head">
        <h3>{shelter.name}</h3>
        <span className={`pill state-${shelter.state}`}>{shelter.state}</span>
      </div>

      <div className="meter">
        <div className="meter-fill" style={{ width: `${barPct}%` }} />
      </div>
      <p className="meter-label">
        {shelter.currentOccupancy} / {shelter.capacity} ({shelter.occupancyPct}%)
      </p>

      <dl className="metrics">
        <div>
          <dt>Air (AQI)</dt>
          <dd>{shelter.environment.airQualityIndex}</dd>
        </div>
        <div>
          <dt>Temp</dt>
          <dd>{shelter.environment.temperatureC.toFixed(1)}°C</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{shelter.network.uplinkStatus}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{shelter.network.latencyMs}ms</dd>
        </div>
      </dl>
    </article>
  );
}
