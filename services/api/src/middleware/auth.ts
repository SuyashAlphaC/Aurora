import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { createDevSession, verifySessionToken } from "../cisco/duo.js";

export interface AuthedRequest extends Request {
  user?: { username: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (config.authDisabled) {
    req.user = { username: "dev-coordinator" };
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired session token" });
    return;
  }

  req.user = session;
  next();
}

/** Optional auth for health/public endpoints */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const session = verifySessionToken(header.slice(7));
    if (session) req.user = session;
  }
  next();
}

export { createDevSession };
