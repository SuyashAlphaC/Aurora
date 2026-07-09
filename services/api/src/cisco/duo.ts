import crypto from "crypto";
import { config, isDuoConfigured } from "../config.js";

/** Duo Auth API — duo.com/docs/authapi */
interface DuoApiResponse {
  stat: string;
  response?: {
    result?: string;
    status?: string;
    status_msg?: string;
    devices?: Array<{ device?: string; capabilities?: string[] }>;
  };
  message?: string;
}

function duoSign(method: string, path: string, params: Record<string, string>, date: string): string {
  const canon = [date, method.toUpperCase(), config.duo.apiHost.toLowerCase(), path, canonicalize(params)].join(
    "\n"
  );
  return crypto.createHmac("sha1", config.duo.clientSecret).update(canon).digest("hex");
}

function canonicalize(params: Record<string, string>): string {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
}

async function duoRequest(
  method: string,
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 15_000
): Promise<DuoApiResponse> {
  const date = new Date().toUTCString();
  const sig = duoSign(method, path, params, date);
  const auth = Buffer.from(`${config.duo.clientId}:${sig}`).toString("base64");

  const url =
    method === "GET"
      ? `https://${config.duo.apiHost}${path}?${canonicalize(params)}`
      : `https://${config.duo.apiHost}${path}`;

  const body =
    method === "POST"
      ? new URLSearchParams(params).toString()
      : undefined;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      Date: date,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const data = (await res.json()) as DuoApiResponse;
  if (!res.ok || data.stat !== "OK") {
    const code = (data as { code?: number }).code;
    const detail = data.message ?? `Duo API error ${res.status}`;
    throw new Error(code ? `${detail} (code ${code})` : detail);
  }
  return data;
}

export async function duoCheck(): Promise<boolean> {
  if (!isDuoConfigured()) return false;
  try {
    await duoRequest("GET", "/auth/v2/check");
    return true;
  } catch {
    return false;
  }
}

export async function duoPreauth(username: string): Promise<DuoApiResponse> {
  return duoRequest("POST", "/auth/v2/preauth", { username });
}

export async function duoVerifyPasscode(username: string, passcode: string): Promise<boolean> {
  const data = await duoRequest("POST", "/auth/v2/auth", {
    username,
    factor: "passcode",
    passcode,
  });
  return data.response?.result === "allow";
}

export interface DuoPushResult {
  allowed: boolean;
  status?: string;
  statusMsg?: string;
}

function requirePushDevice(preauth: DuoApiResponse): string {
  const devices = preauth.response?.devices ?? [];
  const pushDevice = devices.find((d) => d.capabilities?.includes("push"));
  if (!pushDevice?.device) {
    const summary =
      devices.length === 0
        ? "no devices on file"
        : devices
            .map((d) => d.capabilities?.join("+") ?? "unknown")
            .join(", ");
    throw new Error(
      `No Duo Push device for this user. In Duo Admin: Users → coordinator → Activate Duo Mobile. Found: ${summary}`
    );
  }
  return pushDevice.device;
}

export async function duoVerifyPush(username: string): Promise<DuoPushResult> {
  const preauth = await duoPreauth(username);
  const preauthResult = preauth.response?.result;

  if (preauthResult === "allow") return { allowed: true, status: "allow" };
  if (preauthResult === "deny") {
    return {
      allowed: false,
      status: "deny",
      statusMsg: preauth.response?.status_msg ?? "User denied by Duo policy",
    };
  }
  if (preauthResult === "enroll") {
    throw new Error("User must enroll a Duo device (activate Duo Mobile on the phone)");
  }

  const device = requirePushDevice(preauth);
  const data = await duoRequest(
    "POST",
    "/auth/v2/auth",
    {
      username,
      factor: "push",
      device,
      async: "0",
    },
    75_000
  );

  return {
    allowed: data.response?.result === "allow",
    status: data.response?.status,
    statusMsg: data.response?.status_msg,
  };
}

/** Issue a simple signed session token for coordinator API access */
export function createSessionToken(username: string): string {
  const payload = {
    sub: username,
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): { username: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", config.sessionSecret).update(body).digest("base64url");
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      sub: string;
      exp: number;
    };
    if (payload.exp < Date.now()) return null;
    return { username: payload.sub };
  } catch {
    return null;
  }
}

/** Dev login when Duo is not configured */
export function createDevSession(username: string): string {
  return createSessionToken(username);
}
