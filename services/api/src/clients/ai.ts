import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import type { AiForecastResponse, AiRerouteResponse, Shelter } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mockResponses: { forecast: AiForecastResponse; reroute: AiRerouteResponse };

function loadMocks(): typeof mockResponses {
  if (!mockResponses) {
    const raw = readFileSync(path.join(__dirname, "..", "mocks", "ai-responses.json"), "utf-8");
    mockResponses = JSON.parse(raw) as typeof mockResponses;
  }
  return mockResponses;
}

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function checkAiHealth(): Promise<"connected" | "mock" | "down"> {
  if (config.aiServiceMock) return "mock";
  try {
    const res = await fetch(`${config.aiServiceUrl}/ai/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok ? "connected" : "down";
  } catch {
    return "down";
  }
}

export async function getForecast(
  shelterId: string,
  capacity: number,
  history: Array<{ timestamp: string; occupancy: number }>
): Promise<AiForecastResponse> {
  if (config.aiServiceMock) {
    const mock = loadMocks().forecast;
    return { ...mock, shelterId };
  }

  try {
    return await fetchJson<AiForecastResponse>(`${config.aiServiceUrl}/ai/forecast`, {
      shelterId,
      capacity,
      history,
    });
  } catch {
    const mock = loadMocks().forecast;
    return { ...mock, shelterId };
  }
}

export async function getRerouteRecommendation(
  fromShelter: Shelter,
  candidates: Shelter[]
): Promise<AiRerouteResponse> {
  const body = {
    fromShelterId: fromShelter.id,
    fromLat: fromShelter.lat,
    fromLng: fromShelter.lng,
    candidates: candidates
      .filter((c) => c.id !== fromShelter.id)
      .map((c) => ({
        id: c.id,
        capacity: c.capacity,
        currentOccupancy: c.currentOccupancy,
        lat: c.lat,
        lng: c.lng,
        environment: { airQualityIndex: c.environment.airQualityIndex },
        network: {
          uplinkStatus: c.network.uplinkStatus,
          latencyMs: c.network.latencyMs,
        },
      })),
  };

  if (config.aiServiceMock) {
    return loadMocks().reroute;
  }

  try {
    return await fetchJson<AiRerouteResponse>(`${config.aiServiceUrl}/ai/reroute`, body);
  } catch {
    return loadMocks().reroute;
  }
}

/** Local fallback reroute when AI service is unavailable */
export function fallbackReroute(fromShelter: Shelter, candidates: Shelter[]): AiRerouteResponse {
  const others = candidates.filter((c) => c.id !== fromShelter.id);
  const ranked = others
    .map((c) => {
      const roomPct = (c.capacity - c.currentOccupancy) / c.capacity;
      const airScore = Math.max(0, 1 - c.environment.airQualityIndex / 200);
      const netScore = c.network.uplinkStatus === "UP" ? 1 : c.network.uplinkStatus === "DEGRADED" ? 0.5 : 0;
      const score = roomPct * 0.5 + airScore * 0.3 + netScore * 0.2;
      const reasons = [
        `${Math.round((c.currentOccupancy / c.capacity) * 100)}% occupancy (${c.currentOccupancy}/${c.capacity})`,
        c.environment.airQualityIndex <= 100
          ? `Good air quality (AQI ${c.environment.airQualityIndex})`
          : `Moderate air quality (AQI ${c.environment.airQualityIndex})`,
        `Uplink ${c.network.uplinkStatus.toLowerCase()} (${c.network.latencyMs}ms)`,
      ];
      return { shelterId: c.id, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  return {
    recommendedShelterId: ranked[0]?.shelterId ?? others[0]?.id ?? fromShelter.id,
    ranked,
  };
}
