"""Aurora AI Service — capacity forecast & reroute recommendation."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.forecast import forecast_capacity
from app.models import ForecastRequest, ForecastResponse, RerouteRequest, RerouteResponse
from app.reroute import recommend_reroute

app = FastAPI(
    title="Aurora AI",
    version="1.0.0",
    description="Explainable capacity forecasting and shelter reroute scoring",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/ai/health")
def health():
    return {"status": "ok", "model": "forecast-v1"}


@app.post("/ai/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    return forecast_capacity(req)


@app.post("/ai/reroute", response_model=RerouteResponse)
def reroute(req: RerouteRequest) -> RerouteResponse:
    return recommend_reroute(req)
