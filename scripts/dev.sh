#!/bin/bash
set -e

echo "=== Launching BAYORA Local Development Servers ==="

# Trap exit to kill child processes
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

# 1. Start FastAPI Control Plane API
echo "[1/2] Starting FastAPI Control Plane API on http://localhost:8000..."
export PYTHONPATH=.
.venv/bin/uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Start Next.js Web Console
echo "[2/2] Starting Next.js Web Console on http://localhost:3000..."
cd apps/web && npm run dev &

wait
