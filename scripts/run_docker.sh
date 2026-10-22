#!/bin/bash
set -e

echo "=== BAYORA Docker Compose Orchestration & Verification ==="
echo "Building and launching all 7 isolated containers..."

docker compose down -v 2>/dev/null || true
docker compose build
docker compose up -d

echo ""
echo "Waiting for services to become healthy..."
sleep 6

echo ""
echo "=== CONTAINER NETWORK TOPOLOGY VERIFICATION ==="
docker compose ps

echo ""
echo "=== RUNNING RED RUNNER BOUNDARY PROBES ==="
docker compose exec red-runner python3 /app/workers/red_runner/probe.py || true

echo ""
echo "=== BAYORA IS LIVE! ==="
echo "-> Web Security Console: http://localhost:3000"
echo "-> Control Plane API Docs: http://localhost:8000/docs"
echo "-> Policy Gateway: http://localhost:8002"
