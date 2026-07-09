export type ShelterState = "HEALTHY" | "WARNING" | "CRITICAL";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type UplinkStatus = "UP" | "DEGRADED" | "DOWN";

export type AlertType =
  | "CAPACITY_WARNING"
  | "CAPACITY_CRITICAL"
  | "AIR_QUALITY"
  | "WATER_LEAK"
  | "NETWORK_DEGRADED"
  | "NETWORK_DOWN"
  | "REROUTE_RECOMMENDED";

export interface EnvironmentReading {
  airQualityIndex: number;
  temperatureC: number;
  humidityPct: number;
  waterLeak: boolean;
}

export interface NetworkReading {
  uplinkStatus: UplinkStatus;
  latencyMs: number;
  lossPct: number;
}

export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  merakiNetworkId: string;
  currentOccupancy: number;
  occupancyPct: number;
  state: ShelterState;
  environment: EnvironmentReading;
  network: NetworkReading;
  updatedAt: string;
}

export interface TelemetryInput {
  shelterId: string;
  timestamp?: string;
  occupancy?: number;
  environment?: Partial<EnvironmentReading>;
  network?: Partial<NetworkReading>;
}

export interface TelemetryRecord {
  id: number;
  shelterId: string;
  timestamp: string;
  occupancy: number;
  airQualityIndex: number;
  temperatureC: number;
  humidityPct: number;
  waterLeak: boolean;
  uplinkStatus: UplinkStatus;
  latencyMs: number;
  lossPct: number;
}

export interface RerouteRecommendation {
  toShelterId: string;
  toShelterName: string;
  reasons: string[];
  etaMinutes: number;
}

export interface Alert {
  id: string;
  shelterId: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  recommendation?: RerouteRecommendation;
  status: AlertStatus;
  createdAt: string;
}

export interface AiForecastResponse {
  shelterId: string;
  minutesToCapacity: number;
  predictedOccupancyAt60Min: number;
  confidence: number;
  explanation: string;
}

export interface AiRerouteResponse {
  recommendedShelterId: string;
  ranked: Array<{
    shelterId: string;
    score: number;
    reasons: string[];
  }>;
}

export interface WsEvent<T = unknown> {
  event: string;
  data: T;
}
