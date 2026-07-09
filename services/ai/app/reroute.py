"""Reroute scoring — weighted multi-factor ranking with explainable reasons."""

from __future__ import annotations

import math

from .explain import air_reason, distance_reason, network_reason, occupancy_reason
from .models import RankedShelter, RerouteCandidate, RerouteRequest, RerouteResponse

WEIGHT_CAPACITY = 0.40
WEIGHT_AIR = 0.25
WEIGHT_NETWORK = 0.20
WEIGHT_DISTANCE = 0.15


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _capacity_score(candidate: RerouteCandidate) -> float:
    if candidate.capacity <= 0:
        return 0.0
    free_ratio = (candidate.capacity - candidate.currentOccupancy) / candidate.capacity
    return max(0.0, min(1.0, free_ratio))


def _air_score(aqi: float) -> float:
    return max(0.0, min(1.0, 1.0 - aqi / 200.0))


def _network_score(status: str) -> float:
    if status == "UP":
        return 1.0
    if status == "DEGRADED":
        return 0.45
    return 0.0


def _distance_score(km: float) -> float:
    return max(0.0, min(1.0, 1.0 - km / 15.0))


def score_candidate(
    candidate: RerouteCandidate, from_lat: float, from_lng: float
) -> tuple[float, list[str]]:
    km = _haversine_km(from_lat, from_lng, candidate.lat, candidate.lng)

    cap = _capacity_score(candidate)
    air = _air_score(candidate.environment.airQualityIndex)
    net = _network_score(candidate.network.uplinkStatus)
    dist = _distance_score(km)

    score = (
        WEIGHT_CAPACITY * cap
        + WEIGHT_AIR * air
        + WEIGHT_NETWORK * net
        + WEIGHT_DISTANCE * dist
    )

    reasons: list[str] = [
        occupancy_reason(candidate.currentOccupancy, candidate.capacity),
        air_reason(candidate.environment.airQualityIndex),
        network_reason(candidate.network.uplinkStatus, candidate.network.latencyMs),
    ]

    if cap >= 0.3 and dist >= 0.5:
        reasons.append(distance_reason(km))

    return round(score, 3), reasons


def recommend_reroute(req: RerouteRequest) -> RerouteResponse:
    ranked: list[RankedShelter] = []

    for c in req.candidates:
        if c.id == req.fromShelterId:
            continue
        if c.currentOccupancy >= c.capacity:
            continue
        if c.network.uplinkStatus == "DOWN":
            continue

        score, reasons = score_candidate(c, req.fromLat, req.fromLng)
        ranked.append(RankedShelter(shelterId=c.id, score=score, reasons=reasons))

    ranked.sort(key=lambda r: r.score, reverse=True)

    if not ranked:
        fallback = next((c for c in req.candidates if c.id != req.fromShelterId), None)
        if fallback:
            score, reasons = score_candidate(fallback, req.fromLat, req.fromLng)
            ranked = [RankedShelter(shelterId=fallback.id, score=score, reasons=reasons)]

    recommended = ranked[0].shelterId if ranked else req.fromShelterId

    return RerouteResponse(recommendedShelterId=recommended, ranked=ranked)
