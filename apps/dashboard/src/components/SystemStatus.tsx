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
    <div className="sys-modules">
      <span className="sys-mod">
        <span className="sys-mod-label">TELEM</span>
        <span className="sys-mod-val mono">{telemetry}</span>
      </span>
      <span className="sys-mod">
        <span className="sys-mod-label">FORECAST</span>
        <span className="sys-mod-val mono">{ai}</span>
      </span>
      <span className="sys-mod">
        <span className="sys-mod-label">AUTH</span>
        <span className="sys-mod-val mono">{health.auth}</span>
      </span>
      {meraki !== "not_configured" && meraki !== false && (
        <span className="sys-mod online">
          <span className="sys-mod-label">MERAKI</span>
          <span className="sys-mod-val">LINK</span>
        </span>
      )}
      {webex !== "not_configured" && (
        <span className="sys-mod online">
          <span className="sys-mod-label">WEBEX</span>
          <span className="sys-mod-val">LINK</span>
        </span>
      )}
    </div>
  );
}
