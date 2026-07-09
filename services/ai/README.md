# Aurora AI Service

Explainable capacity forecasting and reroute scoring.

## Run

```bash
cd services/ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Test

```bash
pytest tests/ -v
curl http://localhost:8001/ai/health
curl -X POST http://localhost:8001/ai/forecast -H "Content-Type: application/json" -d @fixtures/forecast_request.json
curl -X POST http://localhost:8001/ai/reroute -H "Content-Type: application/json" -d @fixtures/reroute_request.json
```

## Simulator

```bash
python simulator/run_golden_path.py --api-url http://localhost:8000 --fast
```
