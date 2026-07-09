import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { RerouteAcceptedEvent, Shelter } from "../types";

function stateColor(state: Shelter["state"]): string {
  if (state === "CRITICAL") return "#ef4444";
  if (state === "WARNING") return "#eab308";
  return "#22c55e";
}

interface Props {
  shelters: Shelter[];
  activeReroute: RerouteAcceptedEvent | null;
}

export function ShelterMap({ shelters, activeReroute }: Props) {
  return (
    <MapContainer
      center={[19.082, 72.885]}
      zoom={13}
      className="map-container"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shelters.map((s) => {
        const isTarget = activeReroute?.toShelterId === s.id;
        const isSource = activeReroute?.fromShelterId === s.id;
        const color = isTarget ? "#3b82f6" : stateColor(s.state);
        const radius = s.state === "CRITICAL" ? 18 : 14;

        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: isTarget || isSource ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <strong>{s.name}</strong>
              <br />
              {s.occupancyPct}% · {s.state}
            </Tooltip>
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {s.currentOccupancy}/{s.capacity} ({s.occupancyPct}%)
              <br />
              AQI {s.environment.airQualityIndex} · {s.network.uplinkStatus}
              <br />
              <span className={`state-${s.state}`}>{s.state}</span>
              {isTarget && <p className="reroute-tag">Intake routed here</p>}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
