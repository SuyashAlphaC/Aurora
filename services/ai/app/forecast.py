"""Capacity forecasting — explainable linear trend on occupancy history."""

from __future__ import annotations

from datetime import datetime

from .explain import forecast_explanation
from .models import ForecastRequest, ForecastResponse


def _parse_ts(ts: str) -> float:
    normalized = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized).timestamp()


def forecast_capacity(req: ForecastRequest) -> ForecastResponse:
    history = sorted(req.history, key=lambda h: _parse_ts(h.timestamp))

    if len(history) == 1:
        rate = 2.0
        confidence = 0.5
        points_used = 1
    else:
        t0 = _parse_ts(history[0].timestamp)
        t1 = _parse_ts(history[-1].timestamp)
        dt_min = max((t1 - t0) / 60.0, 0.1)
        rate = (history[-1].occupancy - history[0].occupancy) / dt_min
        points_used = len(history)

        if len(history) >= 3:
            rates = []
            for i in range(1, len(history)):
                ti = _parse_ts(history[i - 1].timestamp)
                tj = _parse_ts(history[i].timestamp)
                dm = max((tj - ti) / 60.0, 0.1)
                rates.append((history[i].occupancy - history[i - 1].occupancy) / dm)
            variance = sum((r - rate) ** 2 for r in rates) / len(rates)
            confidence = max(0.55, min(0.95, 1.0 - variance / 50.0))
        else:
            confidence = 0.7

    current = history[-1].occupancy
    remaining = max(req.capacity - current, 0)

    if rate <= 0.1:
        minutes_to_capacity = 999
        predicted_60 = current
        explanation = (
            f"Occupancy stable at {current}/{req.capacity}; "
            "no significant inflow trend detected."
        )
    else:
        minutes_to_capacity = max(1, int(remaining / rate))
        predicted_60 = int(current + rate * 60)
        explanation = forecast_explanation(rate, points_used)

    return ForecastResponse(
        shelterId=req.shelterId,
        minutesToCapacity=min(minutes_to_capacity, 999),
        predictedOccupancyAt60Min=predicted_60,
        confidence=round(confidence, 2),
        explanation=explanation,
    )
