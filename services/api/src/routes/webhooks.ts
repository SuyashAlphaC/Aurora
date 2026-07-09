import { Router } from "express";
import { getAttachmentAction, verifyWebexWebhookSecret } from "../cisco/webex.js";
import { acceptReroute } from "../services/telemetry.js";
import type { WsHub } from "../ws/hub.js";

interface WebexWebhookBody {
  id?: string;
  name?: string;
  resource?: string;
  event?: string;
  data?: { id?: string; type?: string };
  secret?: string;
}

function extractActionFields(action: Record<string, unknown>): {
  actionType?: string;
  alertId?: string;
} {
  const inputs = (action.inputs as Record<string, string>) ?? {};
  const data = (action.data as Record<string, string>) ?? {};

  return {
    actionType: inputs.action ?? data.action ?? (action.type as string),
    alertId: inputs.alertId ?? data.alertId,
  };
}

export function createWebhooksRouter(ws: WsHub): Router {
  const router = Router();

  /** Webex attachmentActions webhook — developer.webex.com/messaging/docs/api/guides/webhooks */
  router.post("/webex", async (req, res) => {
    const body = req.body as WebexWebhookBody;

    if (!verifyWebexWebhookSecret(body.secret)) {
      res.status(401).json({ error: "Invalid webhook secret" });
      return;
    }

    if (body.resource !== "attachmentActions" || body.event !== "created") {
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const actionId = body.data?.id;
    if (!actionId) {
      res.status(400).json({ error: "Missing attachment action id" });
      return;
    }

    try {
      const action = (await getAttachmentAction(actionId)) as Record<string, unknown>;
      const { actionType, alertId } = extractActionFields(action);

      if (actionType === "accept_reroute" && alertId) {
        const result = await acceptReroute(alertId, ws);
        res.json({ received: true, result });
        return;
      }

      res.json({ received: true, action: actionType ?? "dismiss" });
    } catch (err) {
      console.error("[webex webhook]", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  return router;
}
