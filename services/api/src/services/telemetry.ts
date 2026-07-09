import { randomUUID } from "crypto";
import {
  createAlert,
  getAlertById,
  getShelterById,
  getTelemetryHistory,
  hasOpenCriticalAlert,
  insertTelemetry,
  listShelters,
  updateAlertStatus,
  updateShelter,
} from "../db/index.js";
import { getForecast, getRerouteRecommendation, fallbackReroute } from "../clients/ai.js";
import { sendCriticalAlert } from "../cisco/webex.js";
import { buildAlertMessage, classifyAlertType, computeShelterState } from "../engine/state.js";
import type { Alert, AlertSeverity, Shelter, TelemetryInput } from "../types.js";
import type { WsHub } from "../ws/hub.js";

export interface TelemetryResult {
  accepted: boolean;
  shelterId: string;
  newState: Shelter["state"];
  alertEmitted: boolean;
  shelter: Shelter;
  alert?: Alert;
}

function severityForState(state: Shelter["state"]): AlertSeverity {
  if (state === "CRITICAL") return "CRITICAL";
  if (state === "WARNING") return "WARNING";
  return "INFO";
}

async function maybeCreateCriticalAlert(
  shelter: Shelter,
  previousState: Shelter["state"]
): Promise<Alert | undefined> {
  if (shelter.state !== "CRITICAL") return undefined;

  const alertType = classifyAlertType(
    shelter.occupancyPct,
    shelter.environment,
    shelter.network
  );

  if (hasOpenCriticalAlert(shelter.id, alertType)) return undefined;

  const allShelters = listShelters();
  const history = getTelemetryHistory(shelter.id, 20)
    .reverse()
    .map((t) => ({ timestamp: t.timestamp, occupancy: t.occupancy }));

  let etaMinutes = 18;
  try {
    const forecast = await getForecast(shelter.id, shelter.capacity, history);
    etaMinutes = forecast.minutesToCapacity;
  } catch {
    /* use default */
  }

  let reroute = await getRerouteRecommendation(shelter, allShelters).catch(() =>
    fallbackReroute(shelter, allShelters)
  );

  if (!reroute.ranked.length) {
    reroute = fallbackReroute(shelter, allShelters);
  }

  const recommended = allShelters.find((s) => s.id === reroute.recommendedShelterId);

  const alert: Alert = {
    id: `alert-${randomUUID().slice(0, 8)}`,
    shelterId: shelter.id,
    severity: "CRITICAL",
    type: alertType,
    message: buildAlertMessage(
      shelter.name,
      shelter.occupancyPct,
      shelter.environment,
      shelter.network
    ),
    recommendation: recommended
      ? {
          toShelterId: recommended.id,
          toShelterName: recommended.name,
          reasons: reroute.ranked.find((r) => r.shelterId === recommended.id)?.reasons ?? [],
          etaMinutes,
        }
      : undefined,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };

  createAlert(alert);

  try {
    await sendCriticalAlert(alert, shelter);
  } catch (err) {
    console.error("[webex] Failed to send alert:", err);
  }

  if (previousState !== "CRITICAL") {
    console.log(`[alert] CRITICAL for ${shelter.name}: ${alert.message}`);
  }

  return alert;
}

export async function processTelemetry(input: TelemetryInput, ws: WsHub): Promise<TelemetryResult> {
  const existing = getShelterById(input.shelterId);
  if (!existing) {
    throw new Error(`Shelter not found: ${input.shelterId}`);
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  const occupancy = input.occupancy ?? existing.currentOccupancy;
  const environment = {
    airQualityIndex: input.environment?.airQualityIndex ?? existing.environment.airQualityIndex,
    temperatureC: input.environment?.temperatureC ?? existing.environment.temperatureC,
    humidityPct: input.environment?.humidityPct ?? existing.environment.humidityPct,
    waterLeak: input.environment?.waterLeak ?? existing.environment.waterLeak,
  };
  const network = {
    uplinkStatus: input.network?.uplinkStatus ?? existing.network.uplinkStatus,
    latencyMs: input.network?.latencyMs ?? existing.network.latencyMs,
    lossPct: input.network?.lossPct ?? existing.network.lossPct,
  };

  insertTelemetry({
    shelterId: input.shelterId,
    timestamp,
    occupancy,
    airQualityIndex: environment.airQualityIndex,
    temperatureC: environment.temperatureC,
    humidityPct: environment.humidityPct,
    waterLeak: environment.waterLeak,
    uplinkStatus: network.uplinkStatus,
    latencyMs: network.latencyMs,
    lossPct: network.lossPct,
  });

  const occupancyPct = Math.round((occupancy / existing.capacity) * 100);
  const newState = computeShelterState(occupancyPct, environment, network);
  const previousState = existing.state;

  const updated = updateShelter(input.shelterId, {
    currentOccupancy: occupancy,
    state: newState,
    airQualityIndex: environment.airQualityIndex,
    temperatureC: environment.temperatureC,
    humidityPct: environment.humidityPct,
    waterLeak: environment.waterLeak,
    uplinkStatus: network.uplinkStatus,
    latencyMs: network.latencyMs,
    lossPct: network.lossPct,
    updatedAt: timestamp,
  });

  if (!updated) {
    throw new Error(`Failed to update shelter: ${input.shelterId}`);
  }

  ws.broadcast({ event: "shelter.updated", data: updated });

  let alert: Alert | undefined;
  if (newState === "CRITICAL") {
    alert = await maybeCreateCriticalAlert(updated, previousState);
    if (alert) {
      ws.broadcast({ event: "alert.created", data: alert });
    }
  }

  return {
    accepted: true,
    shelterId: input.shelterId,
    newState,
    alertEmitted: Boolean(alert),
    shelter: updated,
    alert,
  };
}

export async function acceptReroute(alertId: string, ws: WsHub): Promise<{
  status: "RESOLVED";
  fromShelterId: string;
  toShelterId: string;
  acceptedAt: string;
} | null> {
  const alert = getAlertById(alertId);
  if (!alert || !alert.recommendation) return null;

  const acceptedAt = new Date().toISOString();
  updateAlertStatus(alertId, "RESOLVED");

  ws.broadcast({
    event: "reroute.accepted",
    data: {
      alertId,
      fromShelterId: alert.shelterId,
      toShelterId: alert.recommendation.toShelterId,
      acceptedAt,
    },
  });

  return {
    status: "RESOLVED",
    fromShelterId: alert.shelterId,
    toShelterId: alert.recommendation.toShelterId,
    acceptedAt,
  };
}
