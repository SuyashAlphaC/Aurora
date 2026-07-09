#!/usr/bin/env python3
"""Golden-path simulator — POST telemetry to API on a schedule.

Usage:
  python simulator/run_golden_path.py --api-url http://localhost:8000
"""

import argparse
import json
import time
import urllib.request

# Timeline from docs/API_CONTRACT.md
STEPS = [
    (0, 120, 65, "HEALTHY"),
    (300, 140, 80, "HEALTHY"),
    (600, 160, 110, "WARNING"),
    (900, 175, 130, "WARNING"),
    (1080, 185, 150, "CRITICAL"),
    (1200, 190, 155, "CRITICAL"),
]


def post_telemetry(api_url: str, occupancy: int, aqi: int) -> None:
    payload = {
        "shelterId": "shelter-b",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "occupancy": occupancy,
        "environment": {
            "airQualityIndex": aqi,
            "temperatureC": 30.0,
            "humidityPct": 75,
            "waterLeak": False,
        },
        "network": {"uplinkStatus": "UP", "latencyMs": 45, "lossPct": 0.2},
    }
    req = urllib.request.Request(
        f"{api_url.rstrip('/')}/api/telemetry",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        print(resp.read().decode())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--fast", action="store_true", help="1s per step instead of real delays")
    args = parser.parse_args()

    prev_delay = 0
    for delay_sec, occ, aqi, expected in STEPS:
        wait = 1 if args.fast else delay_sec - prev_delay
        prev_delay = delay_sec
        print(f"T+{delay_sec}s → occupancy={occ}, AQI={aqi} ({expected})")
        time.sleep(max(wait, 0))
        try:
            post_telemetry(args.api_url, occ, aqi)
        except Exception as e:
            print(f"  (API not ready: {e})")


if __name__ == "__main__":
    main()
