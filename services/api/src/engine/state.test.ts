import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeShelterState, classifyAlertType } from "../engine/state.js";
import { descriptorDistance, findBestFaceMatch, FACE_MATCH_THRESHOLD } from "../services/faceMatch.js";

describe("computeShelterState", () => {
  const env = { airQualityIndex: 50, temperatureC: 28, humidityPct: 60, waterLeak: false };
  const netUp = { uplinkStatus: "UP" as const, latencyMs: 40, lossPct: 0.1 };
  const netDown = { uplinkStatus: "DOWN" as const, latencyMs: 0, lossPct: 100 };

  it("returns HEALTHY under thresholds", () => {
    assert.equal(computeShelterState(50, env, netUp), "HEALTHY");
  });

  it("returns WARNING at 75% occupancy", () => {
    assert.equal(computeShelterState(76, env, netUp), "WARNING");
  });

  it("returns CRITICAL at 90% occupancy", () => {
    assert.equal(computeShelterState(91, env, netUp), "CRITICAL");
  });

  it("returns CRITICAL when network is DOWN", () => {
    assert.equal(computeShelterState(50, env, netDown), "CRITICAL");
  });
});

describe("classifyAlertType", () => {
  const env = { airQualityIndex: 50, temperatureC: 28, humidityPct: 60, waterLeak: false };
  const net = { uplinkStatus: "UP" as const, latencyMs: 40, lossPct: 0.1 };

  it("classifies capacity critical", () => {
    assert.equal(classifyAlertType(95, env, net), "CAPACITY_CRITICAL");
  });
});

describe("faceMatch", () => {
  const base = Array.from({ length: 128 }, (_, i) => i / 128);

  it("returns zero distance for identical descriptors", () => {
    assert.equal(descriptorDistance(base, [...base]), 0);
  });

  it("finds match within threshold", () => {
    const near = base.map((v) => v + 0.001);
    const result = findBestFaceMatch(near, [{ id: "evac-1", descriptor: base }]);
    assert.ok(result);
    assert.equal(result!.id, "evac-1");
    assert.ok(result!.confidence > 90);
  });

  it("rejects match beyond threshold", () => {
    const far = base.map((v) => v + 0.5);
    const result = findBestFaceMatch(far, [{ id: "evac-1", descriptor: base }]);
    assert.equal(result, null);
    assert.ok(FACE_MATCH_THRESHOLD > 0);
  });
});
