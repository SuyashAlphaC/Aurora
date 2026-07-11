import { Router } from "express";
import { config, isDuoConfigured } from "../config.js";
import {
  createDevSession,
  createSessionToken,
  duoPreauth,
  duoVerifyPasscode,
  duoVerifyPush,
  verifySessionToken,
} from "../cisco/duo.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, passcode, factor } = req.body as {
    username?: string;
    passcode?: string;
    factor?: "passcode" | "push" | "dev";
  };

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  if (config.authDisabled) {
    const token = createDevSession(username);
    res.json({
      token,
      username,
      mode: "dev",
      message: "AUTH_DISABLED=true — development session only",
    });
    return;
  }

  if (!isDuoConfigured()) {
    if (factor === "push" || factor === "passcode" || passcode) {
      res.status(503).json({
        error: "Duo MFA is not configured on the API",
        hint: "Create services/api/.env with DUO_CLIENT_ID, DUO_CLIENT_SECRET, DUO_API_HOST from Duo Admin, then restart the API",
      });
      return;
    }
    if (factor === "dev") {
      const token = createDevSession(username);
      res.json({
        token,
        username,
        mode: "dev",
        message: "Development session — set Duo credentials for production MFA",
      });
      return;
    }
    const token = createDevSession(username);
    res.json({
      token,
      username,
      mode: "dev",
      message: "Development session — set Duo credentials for production MFA",
    });
    return;
  }

  try {
    if (factor === "push") {
      const pushResult = await duoVerifyPush(username);
      if (!pushResult.allowed) {
        res.status(401).json({
          error: "Duo push denied",
          details: pushResult.statusMsg ?? pushResult.status ?? "No approval received",
        });
        return;
      }
    } else if (passcode) {
      const allowed = await duoVerifyPasscode(username, passcode);
      if (!allowed) {
        res.status(401).json({ error: "Invalid Duo passcode" });
        return;
      }
    } else {
      const preauth = await duoPreauth(username);
      res.status(200).json({
        requiresMfa: true,
        preauth: preauth.response,
        message: "Submit passcode via POST /api/auth/verify",
      });
      return;
    }

    const token = createSessionToken(username);
    res.json({ token, username, mode: "duo" });
  } catch (err) {
    console.error("[duo]", err);
    res.status(502).json({ error: "Duo authentication failed", details: String(err) });
  }
});

authRouter.post("/verify", async (req, res) => {
  const { username, passcode } = req.body as { username?: string; passcode?: string };
  if (!username || !passcode) {
    res.status(400).json({ error: "username and passcode required" });
    return;
  }

  if (!isDuoConfigured()) {
    if (passcode) {
      res.status(503).json({
        error: "Duo MFA is not configured on the API",
        hint: "Set DUO_CLIENT_ID, DUO_CLIENT_SECRET, DUO_API_HOST in services/api/.env",
      });
      return;
    }
    res.json({ token: createDevSession(username), username, mode: "dev" });
    return;
  }

  try {
    const allowed = await duoVerifyPasscode(username, passcode);
    if (!allowed) {
      res.status(401).json({ error: "Invalid passcode" });
      return;
    }
    res.json({ token: createSessionToken(username), username, mode: "duo" });
  } catch (err) {
    res.status(502).json({ error: "Duo verify failed", details: String(err) });
  }
});

authRouter.get("/me", (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const session = verifySessionToken(header.slice(7));
  if (!session) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  res.json({ username: session.username });
});
