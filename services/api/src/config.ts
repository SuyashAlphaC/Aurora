import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT) || 8000,
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "data", "aurora.db"),
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8001",
  aiServiceMock: process.env.AI_SERVICE_MOCK === "true",

  /** Skip Duo on /api/* when true (local dev without Duo credentials) */
  authDisabled: process.env.AUTH_DISABLED === "true",

  /** Simple session secret for coordinator tokens */
  sessionSecret: process.env.SESSION_SECRET || "aurora-dev-secret-change-in-prod",

  meraki: {
    apiKey: process.env.MERAKI_API_KEY || "",
    orgId: process.env.MERAKI_ORG_ID || "",
    /** Global: api.meraki.com | India: api.meraki.in | Canada: api.meraki.ca */
    baseUrl: process.env.MERAKI_BASE_URL || "https://api.meraki.com/api/v1",
    pollIntervalMs: Number(process.env.MERAKI_POLL_MS) || 60_000,
  },

  webex: {
    botToken: process.env.WEBEX_BOT_TOKEN || "",
    spaceId: process.env.WEBEX_SPACE_ID || "",
    webhookSecret: process.env.WEBEX_WEBHOOK_SECRET || "",
    baseUrl: "https://webexapis.com/v1",
  },

  duo: {
    clientId: process.env.DUO_CLIENT_ID || "",
    clientSecret: process.env.DUO_CLIENT_SECRET || "",
    apiHost: process.env.DUO_API_HOST || "",
  },

  thousandEyes: {
    token: process.env.THOUSANDEYES_TOKEN || "",
    baseUrl: "https://api.thousandeyes.com/v7",
  },
};

export function isMerakiConfigured(): boolean {
  return Boolean(config.meraki.apiKey && config.meraki.orgId);
}

export function isWebexConfigured(): boolean {
  return Boolean(config.webex.botToken && config.webex.spaceId);
}

export function isDuoConfigured(): boolean {
  return Boolean(config.duo.clientId && config.duo.clientSecret && config.duo.apiHost);
}

export function isThousandEyesConfigured(): boolean {
  return Boolean(config.thousandEyes.token);
}
