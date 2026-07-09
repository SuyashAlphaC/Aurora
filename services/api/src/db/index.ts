import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config.js";
import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertType,
  RerouteRecommendation,
  Shelter,
  ShelterState,
  TelemetryRecord,
  UplinkStatus,
} from "../types.js";

const SEED_SHELTERS: Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  merakiNetworkId: string;
  currentOccupancy: number;
  state: ShelterState;
  airQualityIndex: number;
  temperatureC: number;
  humidityPct: number;
  waterLeak: number;
  uplinkStatus: UplinkStatus;
  latencyMs: number;
  lossPct: number;
}> = [
  {
    id: "shelter-a",
    name: "Riverside Primary School",
    lat: 19.076,
    lng: 72.8777,
    capacity: 150,
    merakiNetworkId: "mock-net-a",
    currentOccupancy: 90,
    state: "HEALTHY",
    airQualityIndex: 65,
    temperatureC: 29,
    humidityPct: 70,
    waterLeak: 0,
    uplinkStatus: "UP",
    latencyMs: 50,
    lossPct: 0.1,
  },
  {
    id: "shelter-b",
    name: "Community Hall Sector 12",
    lat: 19.082,
    lng: 72.885,
    capacity: 200,
    merakiNetworkId: "mock-net-b",
    currentOccupancy: 120,
    state: "HEALTHY",
    airQualityIndex: 65,
    temperatureC: 30,
    humidityPct: 72,
    waterLeak: 0,
    uplinkStatus: "UP",
    latencyMs: 45,
    lossPct: 0.2,
  },
  {
    id: "shelter-c",
    name: "Sports Complex North",
    lat: 19.09,
    lng: 72.87,
    capacity: 300,
    merakiNetworkId: "mock-net-c",
    currentOccupancy: 150,
    state: "HEALTHY",
    airQualityIndex: 55,
    temperatureC: 28,
    humidityPct: 68,
    waterLeak: 0,
    uplinkStatus: "UP",
    latencyMs: 40,
    lossPct: 0.1,
  },
  {
    id: "shelter-d",
    name: "St. Mary's Church Hall",
    lat: 19.078,
    lng: 72.892,
    capacity: 180,
    merakiNetworkId: "mock-net-d",
    currentOccupancy: 72,
    state: "HEALTHY",
    airQualityIndex: 45,
    temperatureC: 28,
    humidityPct: 65,
    waterLeak: 0,
    uplinkStatus: "UP",
    latencyMs: 38,
    lossPct: 0.1,
  },
];

let db: Database.Database;

function rowToShelter(row: Record<string, unknown>): Shelter {
  const capacity = row.capacity as number;
  const currentOccupancy = row.current_occupancy as number;
  return {
    id: row.id as string,
    name: row.name as string,
    lat: row.lat as number,
    lng: row.lng as number,
    capacity,
    merakiNetworkId: row.meraki_network_id as string,
    currentOccupancy,
    occupancyPct: Math.round((currentOccupancy / capacity) * 100),
    state: row.state as ShelterState,
    environment: {
      airQualityIndex: row.air_quality_index as number,
      temperatureC: row.temperature_c as number,
      humidityPct: row.humidity_pct as number,
      waterLeak: Boolean(row.water_leak),
    },
    network: {
      uplinkStatus: row.uplink_status as UplinkStatus,
      latencyMs: row.latency_ms as number,
      lossPct: row.loss_pct as number,
    },
    updatedAt: row.updated_at as string,
  };
}

function rowToAlert(row: Record<string, unknown>): Alert {
  let recommendation: RerouteRecommendation | undefined;
  if (row.recommendation_json) {
    recommendation = JSON.parse(row.recommendation_json as string) as RerouteRecommendation;
  }
  return {
    id: row.id as string,
    shelterId: row.shelter_id as string,
    severity: row.severity as AlertSeverity,
    type: row.type as AlertType,
    message: row.message as string,
    recommendation,
    status: row.status as AlertStatus,
    createdAt: row.created_at as string,
  };
}

export function initDatabase(): Database.Database {
  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS shelters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      capacity INTEGER NOT NULL,
      meraki_network_id TEXT NOT NULL,
      current_occupancy INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'HEALTHY',
      air_quality_index REAL NOT NULL DEFAULT 0,
      temperature_c REAL NOT NULL DEFAULT 0,
      humidity_pct REAL NOT NULL DEFAULT 0,
      water_leak INTEGER NOT NULL DEFAULT 0,
      uplink_status TEXT NOT NULL DEFAULT 'UP',
      latency_ms REAL NOT NULL DEFAULT 0,
      loss_pct REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shelter_id TEXT NOT NULL REFERENCES shelters(id),
      timestamp TEXT NOT NULL,
      occupancy INTEGER NOT NULL,
      air_quality_index REAL NOT NULL,
      temperature_c REAL NOT NULL,
      humidity_pct REAL NOT NULL,
      water_leak INTEGER NOT NULL,
      uplink_status TEXT NOT NULL,
      latency_ms REAL NOT NULL,
      loss_pct REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_shelter_ts ON telemetry(shelter_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      shelter_id TEXT NOT NULL REFERENCES shelters(id),
      severity TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      recommendation_json TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM shelters").get() as { c: number };
  if (count.c === 0) {
    seedDatabase();
  }

  return db;
}

export function getDb(): Database.Database {
  if (!db) initDatabase();
  return db;
}

function seedDatabase(): void {
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO shelters (
      id, name, lat, lng, capacity, meraki_network_id, current_occupancy, state,
      air_quality_index, temperature_c, humidity_pct, water_leak,
      uplink_status, latency_ms, loss_pct, updated_at
    ) VALUES (
      @id, @name, @lat, @lng, @capacity, @merakiNetworkId, @currentOccupancy, @state,
      @airQualityIndex, @temperatureC, @humidityPct, @waterLeak,
      @uplinkStatus, @latencyMs, @lossPct, @updatedAt
    )
  `);

  const tx = db.transaction(() => {
    for (const s of SEED_SHELTERS) {
      insert.run({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        capacity: s.capacity,
        merakiNetworkId: s.merakiNetworkId,
        currentOccupancy: s.currentOccupancy,
        state: s.state,
        airQualityIndex: s.airQualityIndex,
        temperatureC: s.temperatureC,
        humidityPct: s.humidityPct,
        waterLeak: s.waterLeak,
        uplinkStatus: s.uplinkStatus,
        latencyMs: s.latencyMs,
        lossPct: s.lossPct,
        updatedAt: now,
      });
    }
  });
  tx();
}

export function listShelters(): Shelter[] {
  const rows = getDb().prepare("SELECT * FROM shelters ORDER BY id").all() as Record<string, unknown>[];
  return rows.map(rowToShelter);
}

export function getShelterById(id: string): Shelter | null {
  const row = getDb().prepare("SELECT * FROM shelters WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToShelter(row) : null;
}

export function updateShelter(
  id: string,
  patch: {
    currentOccupancy?: number;
    state?: ShelterState;
    airQualityIndex?: number;
    temperatureC?: number;
    humidityPct?: number;
    waterLeak?: boolean;
    uplinkStatus?: UplinkStatus;
    latencyMs?: number;
    lossPct?: number;
    updatedAt?: string;
  }
): Shelter | null {
  const existing = getShelterById(id);
  if (!existing) return null;

  const updatedAt = patch.updatedAt ?? new Date().toISOString();
  const currentOccupancy = patch.currentOccupancy ?? existing.currentOccupancy;
  const state = patch.state ?? existing.state;

  getDb()
    .prepare(
      `UPDATE shelters SET
        current_occupancy = @currentOccupancy,
        state = @state,
        air_quality_index = @airQualityIndex,
        temperature_c = @temperatureC,
        humidity_pct = @humidityPct,
        water_leak = @waterLeak,
        uplink_status = @uplinkStatus,
        latency_ms = @latencyMs,
        loss_pct = @lossPct,
        updated_at = @updatedAt
      WHERE id = @id`
    )
    .run({
      id,
      currentOccupancy,
      state,
      airQualityIndex: patch.airQualityIndex ?? existing.environment.airQualityIndex,
      temperatureC: patch.temperatureC ?? existing.environment.temperatureC,
      humidityPct: patch.humidityPct ?? existing.environment.humidityPct,
      waterLeak: (patch.waterLeak ?? existing.environment.waterLeak) ? 1 : 0,
      uplinkStatus: patch.uplinkStatus ?? existing.network.uplinkStatus,
      latencyMs: patch.latencyMs ?? existing.network.latencyMs,
      lossPct: patch.lossPct ?? existing.network.lossPct,
      updatedAt,
    });

  return getShelterById(id);
}

export function insertTelemetry(record: Omit<TelemetryRecord, "id">): TelemetryRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO telemetry (
        shelter_id, timestamp, occupancy, air_quality_index, temperature_c, humidity_pct,
        water_leak, uplink_status, latency_ms, loss_pct
      ) VALUES (
        @shelterId, @timestamp, @occupancy, @airQualityIndex, @temperatureC, @humidityPct,
        @waterLeak, @uplinkStatus, @latencyMs, @lossPct
      )`
    )
    .run({
      shelterId: record.shelterId,
      timestamp: record.timestamp,
      occupancy: record.occupancy,
      airQualityIndex: record.airQualityIndex,
      temperatureC: record.temperatureC,
      humidityPct: record.humidityPct,
      waterLeak: record.waterLeak ? 1 : 0,
      uplinkStatus: record.uplinkStatus,
      latencyMs: record.latencyMs,
      lossPct: record.lossPct,
    });

  return { ...record, id: Number(result.lastInsertRowid) };
}

export function getTelemetryHistory(shelterId: string, limit = 20): TelemetryRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM telemetry WHERE shelter_id = ? ORDER BY timestamp DESC LIMIT ?`
    )
    .all(shelterId, limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: row.id as number,
    shelterId: row.shelter_id as string,
    timestamp: row.timestamp as string,
    occupancy: row.occupancy as number,
    airQualityIndex: row.air_quality_index as number,
    temperatureC: row.temperature_c as number,
    humidityPct: row.humidity_pct as number,
    waterLeak: Boolean(row.water_leak),
    uplinkStatus: row.uplink_status as UplinkStatus,
    latencyMs: row.latency_ms as number,
    lossPct: row.loss_pct as number,
  }));
}

export function createAlert(alert: Alert): Alert {
  getDb()
    .prepare(
      `INSERT INTO alerts (id, shelter_id, severity, type, message, recommendation_json, status, created_at)
       VALUES (@id, @shelterId, @severity, @type, @message, @recommendationJson, @status, @createdAt)`
    )
    .run({
      id: alert.id,
      shelterId: alert.shelterId,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      recommendationJson: alert.recommendation ? JSON.stringify(alert.recommendation) : null,
      status: alert.status,
      createdAt: alert.createdAt,
    });
  return alert;
}

export function listAlerts(limit = 20): Alert[] {
  const rows = getDb()
    .prepare("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Record<string, unknown>[];
  return rows.map(rowToAlert);
}

export function getAlertById(id: string): Alert | null {
  const row = getDb().prepare("SELECT * FROM alerts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToAlert(row) : null;
}

export function updateAlertStatus(id: string, status: AlertStatus): Alert | null {
  getDb().prepare("UPDATE alerts SET status = ? WHERE id = ?").run(status, id);
  return getAlertById(id);
}

export function hasOpenCriticalAlert(shelterId: string, type: AlertType): boolean {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM alerts
       WHERE shelter_id = ? AND type = ? AND status = 'OPEN' AND severity = 'CRITICAL'`
    )
    .get(shelterId, type) as { c: number };
  return row.c > 0;
}

export function getShelterByMerakiNetworkId(networkId: string): Shelter | null {
  const row = getDb()
    .prepare("SELECT * FROM shelters WHERE meraki_network_id = ?")
    .get(networkId) as Record<string, unknown> | undefined;
  return row ? rowToShelter(row) : null;
}
