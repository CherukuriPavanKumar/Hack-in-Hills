#!/bin/bash
set -e

echo "=== Running BAYORA Automated Security & Unit Test Suite ==="
export PYTHONPATH=.

if [ -d ".venv" ]; then
    .venv/bin/pytest -v tests/
else
    pytest -v tests/
fi

echo "=== All 21 Cryptographic, Isolation & Acceptance Tests Passed! ==="
