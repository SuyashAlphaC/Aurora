import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

interface HealthResponse {
  ai: string;
  auth: string;
  dataSource?: {
    telemetry: string;
    ai: string;
    shelters: string;
  };
  cisco?: {
    meraki: string | boolean;
    webex: string;
    duo: string | boolean;
    thousandEyes: boolean;
  };
}

export function SystemStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    apiFetch<HealthResponse>("/api/health")
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  if (!health) return null;

  const telemetry = health.dataSource?.telemetry ?? "unknown";
  const ai = health.dataSource?.ai ?? health.ai;
  const meraki = health.cisco?.meraki;
  const webex = health.cisco?.webex;

  return (
    <div className="system-status">
      <span className="status-chip">Telemetry: {telemetry}</span>
      <span className="status-chip">AI: {ai}</span>
      <span className="status-chip">Auth: {health.auth}</span>
      {meraki !== "not_configured" && <span className="status-chip on">Meraki</span>}
      {webex !== "not_configured" && <span className="status-chip on">Webex</span>}
    </div>
  );
}
