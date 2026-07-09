import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { RerouteAcceptedEvent, Shelter } from "../types";

function stateColor(state: Shelter["state"]): string {
  if (state === "CRITICAL") return "#ff2d2d";
  if (state === "WARNING") return "#f59e0b";
  return "#00e676";
}

interface Props {
  shelters: Shelter[];
  activeReroute: RerouteAcceptedEvent | null;
}

export function ShelterMap({ shelters, activeReroute }: Props) {
  return (
    <div className="map-frame">
      <div className="map-overlay-corner tl mono">GRID 19.08°N · 72.88°E</div>
      <div className="map-overlay-corner br mono">LIVE OVERLAY</div>
      <MapContainer
        center={[19.082, 72.885]}
        zoom={13}
        className="map-container"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {shelters.map((s) => {
          const isTarget = activeReroute?.toShelterId === s.id;
          const isSource = activeReroute?.fromShelterId === s.id;
          const color = isTarget ? "#00e5ff" : stateColor(s.state);
          const radius = s.state === "CRITICAL" ? 20 : s.state === "WARNING" ? 16 : 13;

          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={radius}
              pathOptions={{
                color: isTarget || isSource ? "#fff" : color,
                fillColor: color,
                fillOpacity: s.state === "CRITICAL" ? 0.95 : 0.75,
                weight: isTarget || isSource ? 3 : 2,
                className: s.state === "CRITICAL" ? "marker-critical" : "",
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} className="map-tooltip">
                <strong>{s.name}</strong>
                <br />
                {s.occupancyPct}% · {s.state}
              </Tooltip>
              <Popup className="map-popup">
                <div className="popup-head">{s.id.toUpperCase()}</div>
                <strong>{s.name}</strong>
                <br />
                {s.currentOccupancy}/{s.capacity} ({s.occupancyPct}%)
                <br />
                AQI {s.environment.airQualityIndex} · {s.network.uplinkStatus}
                <br />
                <span className={`state-${s.state}`}>{s.state}</span>
                {isTarget && <p className="reroute-tag">▸ INTAKE ROUTED HERE</p>}
                {isSource && <p className="reroute-tag source">▸ SOURCE SHELTER</p>}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
