export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  currentOccupancy: number;
  occupancyPct: number;
  state: "HEALTHY" | "WARNING" | "CRITICAL";
  environment: {
    airQualityIndex: number;
    temperatureC: number;
    humidityPct: number;
    waterLeak: boolean;
  };
  network: {
    uplinkStatus: "UP" | "DEGRADED" | "DOWN";
    latencyMs: number;
    lossPct: number;
  };
  updatedAt: string;
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
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  message: string;
  recommendation?: RerouteRecommendation;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
}

export interface LoginResponse {
  token?: string;
  username?: string;
  mode?: "dev" | "duo";
  message?: string;
  requiresMfa?: boolean;
  preauth?: unknown;
  error?: string;
}

export interface WsEvent<T = unknown> {
  event: string;
  data: T;
}

export interface RerouteAcceptedEvent {
  alertId: string;
  fromShelterId: string;
  toShelterId: string;
  acceptedAt: string;
}
