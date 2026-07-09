"""Explainable reason strings for AI outputs."""

from __future__ import annotations


def occupancy_reason(current: int, capacity: int) -> str:
    pct = round((current / capacity) * 100) if capacity else 0
    if pct >= 90:
        return f"{pct}% occupancy — near capacity ({current}/{capacity})"
    if pct >= 75:
        return f"{pct}% occupancy ({current}/{capacity})"
    return f"{pct}% occupancy ({current}/{capacity})"


def air_reason(aqi: float) -> str:
    if aqi <= 50:
        return f"Good air quality (AQI {int(aqi)})"
    if aqi <= 100:
        return f"Moderate air quality (AQI {int(aqi)})"
    return f"Poor air quality (AQI {int(aqi)})"


def network_reason(status: str, latency_ms: float) -> str:
    label = status.lower()
    if status == "UP":
        return f"Healthy uplink ({int(latency_ms)}ms)"
    if status == "DEGRADED":
        return f"Degraded uplink ({int(latency_ms)}ms)"
    return "Network offline"


def distance_reason(km: float) -> str:
    if km < 1:
        return f"Very close ({km:.1f} km)"
    return f"Nearest viable shelter ({km:.1f} km)"


def forecast_explanation(rate_per_min: float, points_used: int) -> str:
    direction = "rising" if rate_per_min >= 0 else "falling"
    return (
        f"Occupancy {direction} ~{abs(rate_per_min):.1f}/min "
        f"based on last {points_used} readings."
    )
