import { Router } from "express";
import { getShelterById, listShelters } from "../db/index.js";

export const sheltersRouter = Router();

sheltersRouter.get("/", (_req, res) => {
  res.json({ shelters: listShelters() });
});

sheltersRouter.get("/:id", (req, res) => {
  const shelter = getShelterById(req.params.id);
  if (!shelter) {
    res.status(404).json({ error: "Shelter not found" });
    return;
  }
  res.json(shelter);
});
