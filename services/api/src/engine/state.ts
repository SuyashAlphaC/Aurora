import type { EnvironmentReading, NetworkReading, ShelterState } from "../types.js";

/** State rules from docs/API_CONTRACT.md */
export function computeShelterState(
  occupancyPct: number,
  environment: EnvironmentReading,
  network: NetworkReading
): ShelterState {
  if (
    occupancyPct >= 90 ||
    environment.airQualityIndex >= 150 ||
    environment.waterLeak ||
    network.uplinkStatus === "DOWN"
  ) {
    return "CRITICAL";
  }

  if (
    occupancyPct >= 75 ||
    environment.airQualityIndex >= 100 ||
    network.uplinkStatus === "DEGRADED"
  ) {
    return "WARNING";
  }

  return "HEALTHY";
}

export function classifyAlertType(
  occupancyPct: number,
  environment: EnvironmentReading,
  network: NetworkReading
): "CAPACITY_CRITICAL" | "AIR_QUALITY" | "WATER_LEAK" | "NETWORK_DOWN" | "NETWORK_DEGRADED" | "CAPACITY_WARNING" {
  if (network.uplinkStatus === "DOWN") return "NETWORK_DOWN";
  if (environment.waterLeak) return "WATER_LEAK";
  if (occupancyPct >= 90) return "CAPACITY_CRITICAL";
  if (environment.airQualityIndex >= 150) return "AIR_QUALITY";
  if (network.uplinkStatus === "DEGRADED") return "NETWORK_DEGRADED";
  return "CAPACITY_WARNING";
}

export function buildAlertMessage(
  shelterName: string,
  occupancyPct: number,
  environment: EnvironmentReading,
  network: NetworkReading
): string {
  const parts: string[] = [];

  if (occupancyPct >= 90) {
    parts.push(`${shelterName} at ${occupancyPct}% capacity`);
  } else if (occupancyPct >= 75) {
    parts.push(`${shelterName} approaching capacity (${occupancyPct}%)`);
  }

  if (environment.airQualityIndex >= 150) {
    parts.push("air quality unsafe");
  } else if (environment.airQualityIndex >= 100) {
    parts.push("air quality degrading");
  }

  if (environment.waterLeak) {
    parts.push("water leak detected");
  }

  if (network.uplinkStatus === "DOWN") {
    parts.push("network offline");
  } else if (network.uplinkStatus === "DEGRADED") {
    parts.push("network degraded");
  }

  if (parts.length === 0) {
    return `${shelterName} requires attention`;
  }

  return parts.join("; ") + ".";
}
