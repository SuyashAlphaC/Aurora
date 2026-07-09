"""Pydantic models matching docs/API_CONTRACT.md"""

from pydantic import BaseModel, Field


class HistoryPoint(BaseModel):
    timestamp: str
    occupancy: int


class ForecastRequest(BaseModel):
    shelterId: str
    capacity: int
    history: list[HistoryPoint] = Field(min_length=1)


class ForecastResponse(BaseModel):
    shelterId: str
    minutesToCapacity: int
    predictedOccupancyAt60Min: int
    confidence: float
    explanation: str


class CandidateEnvironment(BaseModel):
    airQualityIndex: float


class CandidateNetwork(BaseModel):
    uplinkStatus: str
    latencyMs: float = 0


class RerouteCandidate(BaseModel):
    id: str
    capacity: int
    currentOccupancy: int
    lat: float
    lng: float
    environment: CandidateEnvironment
    network: CandidateNetwork


class RerouteRequest(BaseModel):
    fromShelterId: str
    fromLat: float
    fromLng: float
    candidates: list[RerouteCandidate]


class RankedShelter(BaseModel):
    shelterId: str
    score: float
    reasons: list[str]


class RerouteResponse(BaseModel):
    recommendedShelterId: str
    ranked: list[RankedShelter]
