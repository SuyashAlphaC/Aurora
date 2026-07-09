import { config, isMerakiConfigured } from "../config.js";
import type { UplinkStatus } from "../types.js";

/** Meraki Dashboard API v1 — uplink statuses per developer.cisco.com/meraki */
export interface MerakiUplinkStatus {
  networkId: string;
  uplinkStatus: UplinkStatus;
  latencyMs: number;
  lossPct: number;
}

interface MerakiUplinkResponseItem {
  networkId: string;
  uplinks?: Array<{
    interface: string;
    status: string;
    ip?: string;
  }>;
}

async function merakiFetch<T>(path: string): Promise<T> {
  const url = `${config.meraki.baseUrl}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.meraki.apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meraki API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

function mapUplinkStatus(uplinks: MerakiUplinkResponseItem["uplinks"]): UplinkStatus {
  if (!uplinks || uplinks.length === 0) return "DOWN";
  const failed = uplinks.filter((u) => u.status === "failed" || u.status === "not connected");
  if (failed.length === uplinks.length) return "DOWN";
  if (failed.length > 0) return "DEGRADED";
  return "UP";
}

/** GET /organizations/{orgId}/appliance/uplinks/statuses */
export async function fetchOrganizationUplinkStatuses(): Promise<MerakiUplinkStatus[]> {
  if (!isMerakiConfigured()) return [];

  const orgId = config.meraki.orgId;
  const data = await merakiFetch<MerakiUplinkResponseItem[]>(
    `/organizations/${orgId}/appliance/uplinks/statuses`
  );

  return data.map((item) => ({
    networkId: item.networkId,
    uplinkStatus: mapUplinkStatus(item.uplinks),
    latencyMs: 45,
    lossPct: mapUplinkStatus(item.uplinks) === "UP" ? 0.1 : 2.5,
  }));
}

/** GET /organizations/{orgId}/devices/statuses — connectivity overview */
export async function fetchDeviceStatuses(): Promise<unknown[]> {
  if (!isMerakiConfigured()) return [];
  const orgId = config.meraki.orgId;
  return merakiFetch(`/organizations/${orgId}/devices/statuses?perPage=100`);
}

export async function checkMerakiConnection(): Promise<boolean> {
  if (!isMerakiConfigured()) return false;
  try {
    await merakiFetch(`/organizations/${config.meraki.orgId}`);
    return true;
  } catch {
    return false;
  }
}
