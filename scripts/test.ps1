# Bayora Automated Test Runner for Windows PowerShell
Write-Host "=== Running BAYORA Automated Security & Unit Test Suite ===" -ForegroundColor Cyan
$env:PYTHONPATH = "."

# 1. Backend Pytest
Write-Host "`n[1/3] Running Backend Tests (pytest)..." -ForegroundColor Yellow
python -m pytest -v tests/
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend tests failed!"
    exit 1
}

# 2. Frontend Vitest
Write-Host "`n[2/3] Running Frontend Unit Tests (vitest)..." -ForegroundColor Yellow
Push-Location "apps\web"
try {
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend tests failed!"
        exit 1
    }
} finally {
    Pop-Location
}

# 3. TypeScript Compilation Check
Write-Host "`n[3/3] Running TypeScript Type Check..." -ForegroundColor Yellow
Push-Location "apps\web"
try {
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Error "TypeScript check failed!"
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host "`n=== All Cryptographic, Isolation, Acceptance & Frontend Tests Passed! ===" -ForegroundColor Green
