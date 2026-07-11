import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import {
  getEvacueeByCode,
  getEvacueeById,
  listEvacuees,
  listEvacueesWithDescriptors,
  logMedicalAccess,
  registerEvacuee,
  toPublicProfile,
  updateEvacueeFaceDescriptor,
} from "../db/medical.js";
import { findBestFaceMatch } from "../services/faceMatch.js";

export const medicalRouter = Router();

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

medicalRouter.get("/evacuees", (_req, res) => {
  res.json({ evacuees: listEvacuees() });
});

medicalRouter.get("/evacuees/:evacueeId", (req: AuthedRequest, res) => {
  const profile = getEvacueeByCode(req.params.evacueeId);
  if (!profile) {
    res.status(404).json({ error: "Evacuee not found" });
    return;
  }

  logMedicalAccess(profile.evacueeId, req.user?.username ?? "unknown", "id_lookup");
  res.json({ profile: toPublicProfile(profile) });
});

medicalRouter.post("/identify", (req: AuthedRequest, res) => {
  const { descriptor } = req.body as { descriptor?: number[] };

  if (!descriptor?.length) {
    res.status(400).json({ error: "descriptor array required (128-dim face embedding)" });
    return;
  }

  const candidates = listEvacueesWithDescriptors();
  if (candidates.length === 0) {
    res.status(404).json({
      error: "No face profiles on file",
      hint: "Register evacuees with face capture at intake, or lookup by evacuee ID (e.g. AUR-1001)",
    });
    return;
  }

  const match = findBestFaceMatch(descriptor, candidates);
  if (!match) {
    res.status(404).json({
      error: "No matching evacuee",
      hint: "Try ID lookup or register this person at intake",
    });
    return;
  }

  const found = getEvacueeById(match.id);
  if (!found) {
    res.status(404).json({ error: "Match found but profile missing" });
    return;
  }

  logMedicalAccess(found.evacueeId, req.user?.username ?? "unknown", "face_scan");

  res.json({
    match: {
      evacueeId: found.evacueeId,
      confidence: match.confidence,
      distance: match.distance,
    },
    profile: toPublicProfile(found),
  });
});

medicalRouter.post("/evacuees", (req: AuthedRequest, res) => {
  const body = req.body as Record<string, unknown>;
  const evacueeId = String(body.evacueeId ?? "").trim();
  const fullName = String(body.fullName ?? "").trim();

  if (!evacueeId || !fullName) {
    res.status(400).json({ error: "evacueeId and fullName are required" });
    return;
  }

  const age = Number(body.age);
  const bloodGroup = String(body.bloodGroup ?? "Unknown").trim();

  if (!Number.isFinite(age) || age < 0 || age > 130) {
    res.status(400).json({ error: "valid age required" });
    return;
  }

  const descriptor = body.faceDescriptor as number[] | undefined;

  try {
    const profile = registerEvacuee(
      {
        evacueeId,
        fullName,
        age,
        bloodGroup,
        allergies: parseStringList(body.allergies),
        conditions: parseStringList(body.conditions),
        medications: parseStringList(body.medications),
        emergencyContact: String(body.emergencyContact ?? ""),
        notes: String(body.notes ?? ""),
        faceDescriptor: descriptor?.length ? descriptor : null,
      },
      req.user?.username ?? "unknown"
    );

    res.status(201).json({ profile: toPublicProfile(profile) });
  } catch (err) {
    res.status(500).json({ error: "Registration failed", details: String(err) });
  }
});

medicalRouter.post("/evacuees/:evacueeId/face", (req: AuthedRequest, res) => {
  const { descriptor } = req.body as { descriptor?: number[] };
  if (!descriptor?.length) {
    res.status(400).json({ error: "descriptor required" });
    return;
  }

  const updated = updateEvacueeFaceDescriptor(req.params.evacueeId, descriptor);
  if (!updated) {
    res.status(404).json({ error: "Evacuee not found" });
    return;
  }

  res.json({ profile: toPublicProfile(updated), message: "Face profile updated" });
});
