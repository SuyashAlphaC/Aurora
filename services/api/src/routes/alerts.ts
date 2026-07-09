import { Router } from "express";
import { listAlerts } from "../db/index.js";

export const alertsRouter = Router();

alertsRouter.get("/", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  res.json({ alerts: listAlerts(limit) });
});
