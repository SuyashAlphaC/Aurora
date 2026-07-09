"""AI service tests."""

from app.forecast import forecast_capacity
from app.models import ForecastRequest, HistoryPoint, RerouteCandidate, RerouteRequest
from app.reroute import recommend_reroute


def test_forecast_rising_trend():
    req = ForecastRequest(
        shelterId="shelter-b",
        capacity=200,
        history=[
            HistoryPoint(timestamp="2026-07-02T14:00:00Z", occupancy=120),
            HistoryPoint(timestamp="2026-07-02T14:10:00Z", occupancy=145),
            HistoryPoint(timestamp="2026-07-02T14:20:00Z", occupancy=168),
            HistoryPoint(timestamp="2026-07-02T14:30:00Z", occupancy=182),
        ],
    )
    result = forecast_capacity(req)
    assert result.shelterId == "shelter-b"
    assert 5 <= result.minutesToCapacity <= 25
    assert result.confidence > 0.5
    assert "rising" in result.explanation.lower() or "min" in result.explanation.lower()


def test_reroute_prefers_shelter_d():
    req = RerouteRequest(
        fromShelterId="shelter-b",
        fromLat=19.082,
        fromLng=72.885,
        candidates=[
            RerouteCandidate(
                id="shelter-a",
                capacity=150,
                currentOccupancy=130,
                lat=19.076,
                lng=72.8777,
                environment={"airQualityIndex": 90},
                network={"uplinkStatus": "UP", "latencyMs": 50},
            ),
            RerouteCandidate(
                id="shelter-d",
                capacity=180,
                currentOccupancy=72,
                lat=19.078,
                lng=72.892,
                environment={"airQualityIndex": 45},
                network={"uplinkStatus": "UP", "latencyMs": 38},
            ),
        ],
    )
    result = recommend_reroute(req)
    assert result.recommendedShelterId == "shelter-d"
    assert len(result.ranked) >= 1
    assert len(result.ranked[0].reasons) >= 3
