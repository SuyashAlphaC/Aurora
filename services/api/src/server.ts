import cors from "cors";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { checkAiHealth } from "./clients/ai.js";
import { checkMerakiConnection } from "./cisco/meraki.js";
import { duoCheck } from "./cisco/duo.js";
import { checkThousandEyesConnection } from "./cisco/thousandeyes.js";
import { config, isDuoConfigured, isMerakiConfigured, isWebexConfigured } from "./config.js";
import { initDatabase } from "./db/index.js";
import { initMedicalSchema } from "./db/medical.js";
import { startMerakiPoller, stopMerakiPoller } from "./jobs/merakiPoller.js";
import { verifySessionToken } from "./cisco/duo.js";
import { requireAuth } from "./middleware/auth.js";
import { alertsRouter } from "./routes/alerts.js";
import { authRouter } from "./routes/auth.js";
import { createRerouteRouter } from "./routes/reroute.js";
import { medicalRouter } from "./routes/medical.js";
import { sheltersRouter } from "./routes/shelters.js";
import { createTelemetryRouter } from "./routes/telemetry.js";
import { createWebhooksRouter } from "./routes/webhooks.js";
import { wsHub } from "./ws/hub.js";

initDatabase();
initMedicalSchema();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: "/ws/live" });

wss.on("connection", (ws, req) => {
  if (!config.authDisabled) {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (!token || !verifySessionToken(token)) {
      ws.close(4401, "Unauthorized");
      return;
    }
  }

  wsHub.add(ws);
  ws.send(JSON.stringify({ event: "connected", data: { message: "Aurora live", clients: wsHub.clientCount } }));

  ws.on("close", () => wsHub.remove(ws));
  ws.on("error", () => wsHub.remove(ws));
});

app.get("/api/health", async (_req, res) => {
  const ai = await checkAiHealth();
  const merakiConfigured = isMerakiConfigured();
  const webexConfigured = isWebexConfigured();
  const duoConfigured = isDuoConfigured();

  res.json({
    status: "ok",
    ai,
    auth: config.authDisabled ? "disabled" : duoConfigured ? "duo" : "session",
    dataSource: {
      telemetry: merakiConfigured ? "meraki_and_simulator" : "simulator",
      ai: ai === "connected" ? "live" : ai,
      shelters: "sqlite",
    },
    cisco: {
      meraki: merakiConfigured ? await checkMerakiConnection() : "not_configured",
      webex: webexConfigured ? "configured" : "not_configured",
      duo: duoConfigured ? await duoCheck() : "not_configured",
      thousandEyes: await checkThousandEyesConnection(),
    },
    websocketClients: wsHub.clientCount,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/webhooks", createWebhooksRouter(wsHub));

/** Simulator + Meraki poller ingest without coordinator session */
app.use("/api/telemetry", createTelemetryRouter(wsHub));

app.use("/api", requireAuth);

app.use("/api/shelters", sheltersRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/reroute", createRerouteRouter(wsHub));
app.use("/api/medical", medicalRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server]", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = config.port;

httpServer.listen(port, () => {
  console.log(`Aurora API listening on http://localhost:${port}`);
  console.log(`  Auth disabled: ${config.authDisabled}`);
  console.log(`  AI mock mode: ${config.aiServiceMock}`);
  startMerakiPoller(wsHub);
});

process.on("SIGINT", () => {
  stopMerakiPoller();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopMerakiPoller();
  process.exit(0);
});
