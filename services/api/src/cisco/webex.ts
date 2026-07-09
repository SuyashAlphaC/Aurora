import { config, isWebexConfigured } from "../config.js";
import type { Alert, Shelter } from "../types.js";

/** Webex Messages API — developer.webex.com/messaging/docs/bots */
async function webexFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.webex.baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.webex.botToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webex API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildRerouteCard(alert: Alert, shelter: Shelter): Record<string, unknown> {
  const rec = alert.recommendation;
  const reasons = rec?.reasons?.map((r) => `- ${r}`).join("\n") ?? "See dashboard for details.";

  return {
    type: "AdaptiveCard",
    version: "1.3",
    body: [
      {
        type: "TextBlock",
        text: "🚨 Aurora Critical Alert",
        weight: "Bolder",
        size: "Medium",
        color: "Attention",
      },
      {
        type: "TextBlock",
        text: alert.message,
        wrap: true,
      },
      {
        type: "TextBlock",
        text: rec
          ? `Recommended reroute: **${rec.toShelterName}** (ETA ~${rec.etaMinutes} min)`
          : "Review shelter status in the command center.",
        wrap: true,
      },
      {
        type: "TextBlock",
        text: reasons,
        wrap: true,
        isSubtle: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Shelter", value: shelter.name },
          { title: "Occupancy", value: `${shelter.currentOccupancy}/${shelter.capacity}` },
          { title: "State", value: shelter.state },
        ],
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Accept reroute",
        data: { action: "accept_reroute", alertId: alert.id },
      },
      {
        type: "Action.Submit",
        title: "Dismiss",
        data: { action: "dismiss", alertId: alert.id },
      },
    ],
  };
}

/** POST /messages with Adaptive Card attachment */
export async function sendCriticalAlert(alert: Alert, shelter: Shelter): Promise<string | null> {
  if (!isWebexConfigured()) {
    console.warn("[webex] Not configured — skipping alert dispatch");
    return null;
  }

  const card = buildRerouteCard(alert, shelter);
  const payload = {
    roomId: config.webex.spaceId,
    text: `Aurora: ${alert.message}`,
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ],
  };

  const result = await webexFetch<{ id: string }>("/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return result.id;
}

/** GET /attachment/actions/{id} — retrieve card submission per Webex webhooks guide */
export async function getAttachmentAction(actionId: string): Promise<{
  id: string;
  type: string;
  inputs?: Record<string, string>;
  messageId?: string;
}> {
  return webexFetch(`/attachment/actions/${actionId}`);
}

export function verifyWebexWebhookSecret(provided: string | undefined): boolean {
  if (!config.webex.webhookSecret) return true;
  return provided === config.webex.webhookSecret;
}
