import { config, isMerakiConfigured } from "../config.js";
import { getDb, getShelterByMerakiNetworkId, listShelters } from "../db/index.js";
import { fetchOrganizationUplinkStatuses } from "../cisco/meraki.js";
import { processTelemetry } from "../services/telemetry.js";
import type { WsHub } from "../ws/hub.js";

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startMerakiPoller(ws: WsHub): void {
  if (!isMerakiConfigured()) {
    console.log("[meraki] Skipping poller — MERAKI_API_KEY / MERAKI_ORG_ID not set");
    return;
  }

  const poll = async () => {
    try {
      const statuses = await fetchOrganizationUplinkStatuses();
      const shelters = listShelters();
      const networkMap = new Map(shelters.map((s) => [s.merakiNetworkId, s.id]));

      for (const status of statuses) {
        const shelterId = networkMap.get(status.networkId);
        if (!shelterId) continue;

        const shelter = getShelterByMerakiNetworkId(status.networkId);
        if (!shelter) continue;

        await processTelemetry(
          {
            shelterId,
            network: {
              uplinkStatus: status.uplinkStatus,
              latencyMs: status.latencyMs,
              lossPct: status.lossPct,
            },
          },
          ws
        );
      }

      console.log(`[meraki] Polled ${statuses.length} uplink statuses`);
    } catch (err) {
      console.error("[meraki] Poll failed:", err);
    }
  };

  poll();
  pollTimer = setInterval(poll, config.meraki.pollIntervalMs);
  console.log(`[meraki] Poller started (every ${config.meraki.pollIntervalMs}ms)`);
}

export function stopMerakiPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function mapShelterToMerakiNetwork(shelterId: string, merakiNetworkId: string): void {
  getDb().prepare("UPDATE shelters SET meraki_network_id = ? WHERE id = ?").run(merakiNetworkId, shelterId);
}
