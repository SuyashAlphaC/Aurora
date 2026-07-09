import { Router } from "express";
import { getAlertById } from "../db/index.js";
import { acceptReroute } from "../services/telemetry.js";
import type { WsHub } from "../ws/hub.js";

export function createRerouteRouter(ws: WsHub): Router {
  const router = Router();

  router.post("/:alertId/accept", async (req, res) => {
    const alert = getAlertById(req.params.alertId);
    if (!alert) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    const result = await acceptReroute(req.params.alertId, ws);
    if (!result) {
      res.status(400).json({ error: "Alert has no reroute recommendation" });
      return;
    }

    res.json(result);
  });

  return router;
}
