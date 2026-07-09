import { Router } from "express";
import { processTelemetry } from "../services/telemetry.js";
import type { TelemetryInput } from "../types.js";
import type { WsHub } from "../ws/hub.js";

export function createTelemetryRouter(ws: WsHub): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      const input = req.body as TelemetryInput;
      if (!input.shelterId) {
        res.status(400).json({ error: "shelterId is required" });
        return;
      }

      const result = await processTelemetry(input, ws);
      res.json({
        accepted: result.accepted,
        shelterId: result.shelterId,
        newState: result.newState,
        alertEmitted: result.alertEmitted,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("not found")) {
        res.status(404).json({ error: message });
        return;
      }
      console.error("[telemetry]", err);
      res.status(500).json({ error: "Failed to process telemetry" });
    }
  });

  return router;
}
